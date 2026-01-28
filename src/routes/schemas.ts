import { Hono } from 'hono';
import { eq, and, max, sql } from 'drizzle-orm';
import type { AppEnv } from '../index';
import { getDb } from '../db/client';
import { schemas, schemaVersions } from '../db/schema';
import { createSchemaRequestSchema, createSchemaVersionRequestSchema } from '../types/api';
import { ValidationError, NotFoundError, ConflictError } from '../lib/errors';

/** Check if an error is a Postgres unique constraint violation (code 23505) */
function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505';
}

const schemasRoute = new Hono<AppEnv>();

schemasRoute.post('/api/schemas', async (c) => {
  const body = await c.req.json();
  const parsed = createSchemaRequestSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid request body', parsed.error.flatten());
  }

  const tenantId = c.get('tenantId');
  const userId = c.get('user').id;
  const db = getDb();

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

  return c.json(
    {
      schema: result.schema,
      version: result.version,
    },
    201,
  );
});

schemasRoute.post('/api/schemas/:schemaId/versions', async (c) => {
  const body = await c.req.json();
  const parsed = createSchemaVersionRequestSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid request body', parsed.error.flatten());
  }

  const tenantId = c.get('tenantId');
  const userId = c.get('user').id;
  const schemaId = c.req.param('schemaId');
  const db = getDb();

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

    return c.json({ version }, 201);
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (isUniqueViolation(err)) {
      throw new ConflictError('Version conflict — please retry');
    }
    throw err;
  }
});

schemasRoute.get('/api/schemas/:schemaId/versions/:version', async (c) => {
  const versionParam = c.req.param('version');
  const versionNum = Number(versionParam);

  if (!Number.isInteger(versionNum) || versionNum < 1) {
    throw new ValidationError('Version must be a positive integer');
  }

  const tenantId = c.get('tenantId');
  const schemaId = c.req.param('schemaId');
  const db = getDb();

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

export default schemasRoute;
