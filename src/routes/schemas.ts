import { Hono } from 'hono';
import { eq, and, max, desc, count } from 'drizzle-orm';
import type { AppEnv } from '../types/app';
import { getDb } from '../db/client';
import type { Database } from '../db/client';
import { schemas, schemaVersions, submissions } from '../db/schema';
import { createSchemaRequestSchema, createSchemaVersionRequestSchema } from '../types/api';
import { ValidationError, NotFoundError, ConflictError } from '../lib/errors';
import { isUniqueViolation } from '../lib/utils/db';
import { AuditService } from '../lib/audit';

export interface SchemasRouteDeps {
  db?: Database;
  auditService?: AuditService;
}

export function createSchemasRoute(depsOverride?: SchemasRouteDeps) {
  const route = new Hono<AppEnv>();

  // Create audit service once per route instance
  let _auditService: AuditService | undefined;

  const getAuditService = (db: Database): AuditService => {
    if (depsOverride?.auditService) return depsOverride.auditService;
    if (!_auditService) _auditService = new AuditService(db);
    return _auditService;
  };

  // List all schemas for tenant
  route.get('/api/schemas', async (c) => {
    const tenantId = c.get('tenantId');
    const db = depsOverride?.db ?? getDb();

    const results = await db
      .select()
      .from(schemas)
      .where(eq(schemas.tenantId, tenantId))
      .orderBy(desc(schemas.updatedAt));

    return c.json({ schemas: results });
  });

  // Get a single schema with its latest version
  route.get('/api/schemas/:schemaId', async (c) => {
    const tenantId = c.get('tenantId');
    const schemaId = c.req.param('schemaId');
    const db = depsOverride?.db ?? getDb();

    const [schema] = await db
      .select()
      .from(schemas)
      .where(and(eq(schemas.id, schemaId), eq(schemas.tenantId, tenantId)))
      .limit(1);

    if (!schema) {
      throw new NotFoundError('Schema not found');
    }

    // Get all versions for this schema
    const versions = await db
      .select()
      .from(schemaVersions)
      .where(eq(schemaVersions.schemaId, schemaId))
      .orderBy(desc(schemaVersions.version));

    const latestVersion = versions[0] ?? null;

    return c.json({ schema, latestVersion, versions });
  });

  route.post('/api/schemas', async (c) => {
    const body = await c.req.json();
    const parsed = createSchemaRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.flatten());
    }

    const tenantId = c.get('tenantId');
    const userId = c.get('user').id;
    const db = depsOverride?.db ?? getDb();

    const result = await db.transaction(async (tx) => {
      const [schema] = await tx
        .insert(schemas)
        .values({
          tenantId,
          name: parsed.data.name,
        })
        .returning();

      const [version] = await tx
        .insert(schemaVersions)
        .values({
          schemaId: schema.id,
          version: 1,
          fields: parsed.data.fields,
          createdBy: userId,
        })
        .returning();

      return { schema, version };
    });

    // Audit log schema creation
    const audit = getAuditService(db);
    await audit.logSchemaCreated(tenantId, result.schema.id, userId, {
      name: parsed.data.name,
      fieldCount: parsed.data.fields.length,
    });

    return c.json(
      {
        schema: result.schema,
        version: result.version,
      },
      201,
    );
  });

  route.post('/api/schemas/:schemaId/versions', async (c) => {
    const body = await c.req.json();
    const parsed = createSchemaVersionRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.flatten());
    }

    const tenantId = c.get('tenantId');
    const userId = c.get('user').id;
    const schemaId = c.req.param('schemaId');
    const db = depsOverride?.db ?? getDb();

    try {
      const version = await db.transaction(async (tx) => {
        // Lock the schema row to serialize concurrent version creation
        const [schema] = await tx
          .select()
          .from(schemas)
          .where(and(eq(schemas.id, schemaId), eq(schemas.tenantId, tenantId)))
          .for('update');

        if (!schema) {
          throw new NotFoundError('Schema not found');
        }

        const [{ maxVersion }] = await tx
          .select({ maxVersion: max(schemaVersions.version) })
          .from(schemaVersions)
          .where(eq(schemaVersions.schemaId, schemaId));

        const nextVersion = (maxVersion ?? 0) + 1;

        const [newVersion] = await tx
          .insert(schemaVersions)
          .values({
            schemaId,
            version: nextVersion,
            fields: parsed.data.fields,
            createdBy: userId,
          })
          .returning();

        return newVersion;
      });

      // Audit log version creation
      const audit = getAuditService(db);
      await audit.logSchemaVersionCreated(tenantId, schemaId, userId, version.version);

      return c.json({ version }, 201);
    } catch (err) {
      if (err instanceof NotFoundError) throw err;
      if (isUniqueViolation(err)) {
        throw new ConflictError('Version conflict — please retry');
      }
      throw err;
    }
  });

  route.get('/api/schemas/:schemaId/versions/:version', async (c) => {
    const versionParam = c.req.param('version');
    const versionNum = Number(versionParam);

    if (!Number.isInteger(versionNum) || versionNum < 1) {
      throw new ValidationError('Version must be a positive integer');
    }

    const tenantId = c.get('tenantId');
    const schemaId = c.req.param('schemaId');
    const db = depsOverride?.db ?? getDb();

    // Verify schema exists and belongs to tenant
    const [schema] = await db
      .select()
      .from(schemas)
      .where(and(eq(schemas.id, schemaId), eq(schemas.tenantId, tenantId)))
      .limit(1);

    if (!schema) {
      throw new NotFoundError('Schema not found');
    }

    const [version] = await db
      .select()
      .from(schemaVersions)
      .where(
        and(eq(schemaVersions.schemaId, schemaId), eq(schemaVersions.version, versionNum)),
      )
      .limit(1);

    if (!version) {
      throw new NotFoundError('Schema version not found');
    }

    return c.json({ version });
  });

  // Delete a schema (only if no submissions reference it)
  route.delete('/api/schemas/:schemaId', async (c) => {
    const tenantId = c.get('tenantId');
    const userId = c.get('user').id;
    const schemaId = c.req.param('schemaId');
    const db = depsOverride?.db ?? getDb();

    // Verify schema exists and belongs to tenant
    const [schema] = await db
      .select()
      .from(schemas)
      .where(and(eq(schemas.id, schemaId), eq(schemas.tenantId, tenantId)))
      .limit(1);

    if (!schema) {
      throw new NotFoundError('Schema not found');
    }

    // Check if any submissions reference this schema
    const [{ submissionCount }] = await db
      .select({ submissionCount: count() })
      .from(submissions)
      .where(eq(submissions.schemaId, schemaId));

    if (submissionCount > 0) {
      throw new ConflictError(
        `Cannot delete schema: ${submissionCount} submission(s) reference this schema`
      );
    }

    // Delete all versions first (due to FK constraint), then delete the schema
    await db.transaction(async (tx) => {
      await tx.delete(schemaVersions).where(eq(schemaVersions.schemaId, schemaId));
      await tx.delete(schemas).where(eq(schemas.id, schemaId));
    });

    // Audit log schema deletion
    const audit = getAuditService(db);
    await audit.log({
      tenantId,
      userId,
      event: 'schema.created', // Using existing event type for now
      resourceType: 'schema',
      resourceId: schemaId,
      details: { action: 'deleted', name: schema.name },
    });

    return c.json({ success: true });
  });

  return route;
}

const schemasRoute = createSchemasRoute();
export default schemasRoute;
