import { describe, it, expect } from 'bun:test';
import { Hono } from 'hono';
import { errorHandler } from '../../src/middleware/error-handler';
import { NotFoundError, ConflictError } from '../../src/lib/errors';

/**
 * Tests for GET /api/schemas, GET /api/schemas/:schemaId, DELETE /api/schemas/:schemaId
 *
 * Stub-based: builds a minimal Hono app that replicates route behavior
 * without depending on a real database.
 */

interface StoredSchema {
  id: string;
  tenantId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface StoredVersion {
  id: string;
  schemaId: string;
  version: number;
  fields: unknown;
  createdAt: string;
  createdBy: string;
}

interface StoredSubmission {
  id: string;
  schemaId: string;
}

function createSchemasListTestApp(options: {
  schemas?: StoredSchema[];
  versions?: StoredVersion[];
  submissions?: StoredSubmission[];
  tenantId?: string;
} = {}) {
  const tenantId = options.tenantId ?? 'tenant-1';
  const storedSchemas: StoredSchema[] = options.schemas ? [...options.schemas] : [];
  const storedVersions: StoredVersion[] = options.versions ? [...options.versions] : [];
  const storedSubmissions: StoredSubmission[] = options.submissions ? [...options.submissions] : [];

  const app = new Hono();
  app.onError(errorHandler);

  // GET /api/schemas (list)
  app.get('/api/schemas', async (c) => {
    const results = storedSchemas
      .filter((s) => s.tenantId === tenantId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return c.json({ schemas: results });
  });

  // GET /api/schemas/:schemaId (detail)
  app.get('/api/schemas/:schemaId', async (c) => {
    const schemaId = c.req.param('schemaId');

    const schema = storedSchemas.find(
      (s) => s.id === schemaId && s.tenantId === tenantId,
    );

    if (!schema) {
      throw new NotFoundError('Schema not found');
    }

    const versions = storedVersions
      .filter((v) => v.schemaId === schemaId)
      .sort((a, b) => b.version - a.version);

    const latestVersion = versions[0] ?? null;

    return c.json({ schema, latestVersion, versions });
  });

  // DELETE /api/schemas/:schemaId
  app.delete('/api/schemas/:schemaId', async (c) => {
    const schemaId = c.req.param('schemaId');

    const schemaIndex = storedSchemas.findIndex(
      (s) => s.id === schemaId && s.tenantId === tenantId,
    );

    if (schemaIndex === -1) {
      throw new NotFoundError('Schema not found');
    }

    // Check if any submissions reference this schema
    const submissionCount = storedSubmissions.filter(
      (s) => s.schemaId === schemaId,
    ).length;

    if (submissionCount > 0) {
      throw new ConflictError(
        `Cannot delete schema: ${submissionCount} submission(s) reference this schema`,
      );
    }

    // Remove versions
    const versionIndices = storedVersions
      .map((v, i) => (v.schemaId === schemaId ? i : -1))
      .filter((i) => i !== -1)
      .reverse();
    for (const i of versionIndices) {
      storedVersions.splice(i, 1);
    }

    // Remove schema
    storedSchemas.splice(schemaIndex, 1);

    return c.json({ success: true });
  });

  return { app, storedSchemas, storedVersions };
}

// --- Fixtures ---

const VALID_FIELD = {
  key: 'company_name',
  label: 'Company Name',
  type: 'string',
  required: true,
  instructions: 'Extract the official company name',
};

const SCHEMA_1: StoredSchema = {
  id: 'schema-1',
  tenantId: 'tenant-1',
  name: 'Onboarding',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-03T00:00:00.000Z',
};

const SCHEMA_2: StoredSchema = {
  id: 'schema-2',
  tenantId: 'tenant-1',
  name: 'Vendor Intake',
  createdAt: '2025-01-02T00:00:00.000Z',
  updatedAt: '2025-01-02T00:00:00.000Z',
};

const SCHEMA_OTHER_TENANT: StoredSchema = {
  id: 'schema-other',
  tenantId: 'other-tenant',
  name: 'Other Tenant Schema',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-04T00:00:00.000Z',
};

const VERSION_1: StoredVersion = {
  id: 'version-1',
  schemaId: 'schema-1',
  version: 1,
  fields: [VALID_FIELD],
  createdAt: '2025-01-01T00:00:00.000Z',
  createdBy: 'user-1',
};

const VERSION_2: StoredVersion = {
  id: 'version-2',
  schemaId: 'schema-1',
  version: 2,
  fields: [{ ...VALID_FIELD, key: 'updated_name' }],
  createdAt: '2025-01-02T00:00:00.000Z',
  createdBy: 'user-1',
};

// --- Helpers ---

function getSchemas(app: Hono) {
  return app.request('/api/schemas');
}

function getSchema(app: Hono, schemaId: string) {
  return app.request(`/api/schemas/${schemaId}`);
}

function deleteSchema(app: Hono, schemaId: string) {
  return app.request(`/api/schemas/${schemaId}`, { method: 'DELETE' });
}

// =====================
// GET /api/schemas
// =====================

describe('GET /api/schemas', () => {
  it('returns empty array when no schemas exist', async () => {
    const { app } = createSchemasListTestApp();
    const res = await getSchemas(app);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.schemas).toEqual([]);
  });

  it('returns schemas for current tenant only', async () => {
    const { app } = createSchemasListTestApp({
      schemas: [SCHEMA_1, SCHEMA_2, SCHEMA_OTHER_TENANT],
    });
    const res = await getSchemas(app);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.schemas).toHaveLength(2);
    expect(body.schemas.map((s: StoredSchema) => s.id)).toEqual(['schema-1', 'schema-2']);
  });

  it('does not return schemas from other tenants', async () => {
    const { app } = createSchemasListTestApp({
      schemas: [SCHEMA_OTHER_TENANT],
    });
    const res = await getSchemas(app);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.schemas).toHaveLength(0);
  });

  it('schemas sorted by updatedAt descending', async () => {
    const { app } = createSchemasListTestApp({
      schemas: [SCHEMA_2, SCHEMA_1], // SCHEMA_2 has earlier updatedAt
    });
    const res = await getSchemas(app);
    const body = await res.json();
    // SCHEMA_1 has updatedAt 2025-01-03, SCHEMA_2 has 2025-01-02
    expect(body.schemas[0].id).toBe('schema-1');
    expect(body.schemas[1].id).toBe('schema-2');
  });
});

// =====================
// GET /api/schemas/:schemaId
// =====================

describe('GET /api/schemas/:schemaId', () => {
  it('returns schema with its versions', async () => {
    const { app } = createSchemasListTestApp({
      schemas: [SCHEMA_1],
      versions: [VERSION_1, VERSION_2],
    });
    const res = await getSchema(app, 'schema-1');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.schema.id).toBe('schema-1');
    expect(body.versions).toHaveLength(2);
  });

  it('returns latestVersion as highest version number', async () => {
    const { app } = createSchemasListTestApp({
      schemas: [SCHEMA_1],
      versions: [VERSION_1, VERSION_2],
    });
    const res = await getSchema(app, 'schema-1');
    const body = await res.json();
    expect(body.latestVersion.version).toBe(2);
  });

  it('returns 404 for non-existent schema', async () => {
    const { app } = createSchemasListTestApp();
    const res = await getSchema(app, 'nonexistent');
    expect(res.status).toBe(404);
  });

  it('returns 404 for schema owned by different tenant', async () => {
    const { app } = createSchemasListTestApp({
      schemas: [SCHEMA_OTHER_TENANT],
    });
    const res = await getSchema(app, 'schema-other');
    expect(res.status).toBe(404);
  });

  it('returns null latestVersion when schema has no versions', async () => {
    const { app } = createSchemasListTestApp({
      schemas: [SCHEMA_1],
      versions: [],
    });
    const res = await getSchema(app, 'schema-1');
    const body = await res.json();
    expect(body.latestVersion).toBeNull();
    expect(body.versions).toHaveLength(0);
  });
});

// =====================
// DELETE /api/schemas/:schemaId
// =====================

describe('DELETE /api/schemas/:schemaId', () => {
  it('deletes schema and returns success', async () => {
    const { app, storedSchemas } = createSchemasListTestApp({
      schemas: [SCHEMA_1],
      versions: [VERSION_1],
    });
    const res = await deleteSchema(app, 'schema-1');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(storedSchemas).toHaveLength(0);
  });

  it('returns 404 for non-existent schema', async () => {
    const { app } = createSchemasListTestApp();
    const res = await deleteSchema(app, 'nonexistent');
    expect(res.status).toBe(404);
  });

  it('returns 404 for schema owned by different tenant', async () => {
    const { app } = createSchemasListTestApp({
      schemas: [SCHEMA_OTHER_TENANT],
    });
    const res = await deleteSchema(app, 'schema-other');
    expect(res.status).toBe(404);
  });

  it('properly removes associated versions', async () => {
    const { app, storedVersions } = createSchemasListTestApp({
      schemas: [SCHEMA_1],
      versions: [VERSION_1, VERSION_2],
    });
    await deleteSchema(app, 'schema-1');
    expect(storedVersions).toHaveLength(0);
  });

  it('returns 409 when submissions reference the schema', async () => {
    const { app } = createSchemasListTestApp({
      schemas: [SCHEMA_1],
      versions: [VERSION_1],
      submissions: [{ id: 'sub-1', schemaId: 'schema-1' }],
    });
    const res = await deleteSchema(app, 'schema-1');
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.message).toContain('submission');
  });
});
