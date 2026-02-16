import { describe, it, expect } from 'bun:test';
import { Hono } from 'hono';
import { errorHandler } from '../../src/middleware/error-handler';
import { ValidationError, NotFoundError } from '../../src/lib/errors';
import {
  createSchemaRequestSchema,
  createSchemaVersionRequestSchema,
} from '../../src/types/api';

/**
 * Schema route tests.
 *
 * Stub-based: builds a minimal Hono app that replicates route behavior
 * without depending on a real database.
 */

interface StoredSchema { id: string; tenantId: string; name: string; createdAt: string; updatedAt: string }
interface StoredVersion { id: string; schemaId: string; version: number; fields: unknown; createdAt: string; createdBy: string }

function createSchemaTestApp(options: {
  schemas?: StoredSchema[];
  versions?: StoredVersion[];
  tenantId?: string;
  userId?: string;
} = {}) {
  const tenantId = options.tenantId ?? 'tenant-1';
  const userId = options.userId ?? 'user-1';
  const storedSchemas: StoredSchema[] = options.schemas ? [...options.schemas] : [];
  const storedVersions: StoredVersion[] = options.versions ? [...options.versions] : [];
  let nextSchemaNum = storedSchemas.length + 1;
  let nextVersionNum = storedVersions.length + 1;

  const app = new Hono();
  app.onError(errorHandler);

  // POST /api/schemas
  app.post('/api/schemas', async (c) => {
    const body = await c.req.json();
    const parsed = createSchemaRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.flatten());
    }

    const schema: StoredSchema = {
      id: `schema-${nextSchemaNum++}`,
      tenantId,
      name: parsed.data.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    storedSchemas.push(schema);

    const version: StoredVersion = {
      id: `version-${nextVersionNum++}`,
      schemaId: schema.id,
      version: 1,
      fields: parsed.data.fields,
      createdAt: new Date().toISOString(),
      createdBy: userId,
    };
    storedVersions.push(version);

    return c.json({ schema, version }, 201);
  });

  // POST /api/schemas/:schemaId/versions
  app.post('/api/schemas/:schemaId/versions', async (c) => {
    const body = await c.req.json();
    const parsed = createSchemaVersionRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.flatten());
    }

    const schemaId = c.req.param('schemaId');
    const schema = storedSchemas.find((s) => s.id === schemaId && s.tenantId === tenantId);
    if (!schema) {
      throw new NotFoundError('Schema not found');
    }

    const existingVersions = storedVersions.filter((v) => v.schemaId === schemaId);
    const maxVersion = existingVersions.reduce((max, v) => Math.max(max, v.version), 0);

    const version: StoredVersion = {
      id: `version-${nextVersionNum++}`,
      schemaId,
      version: maxVersion + 1,
      fields: parsed.data.fields,
      createdAt: new Date().toISOString(),
      createdBy: userId,
    };
    storedVersions.push(version);

    return c.json({ version }, 201);
  });

  // GET /api/schemas/:schemaId/versions/:version
  app.get('/api/schemas/:schemaId/versions/:version', async (c) => {
    const versionParam = c.req.param('version');
    const versionNum = Number(versionParam);
    if (!Number.isInteger(versionNum) || versionNum < 1) {
      throw new ValidationError('Version must be a positive integer');
    }

    const schemaId = c.req.param('schemaId');
    const schema = storedSchemas.find((s) => s.id === schemaId && s.tenantId === tenantId);
    if (!schema) {
      throw new NotFoundError('Schema not found');
    }

    const version = storedVersions.find(
      (v) => v.schemaId === schemaId && v.version === versionNum,
    );
    if (!version) {
      throw new NotFoundError('Schema version not found');
    }

    return c.json({ version });
  });

  return app;
}

// --- Helpers ---

const VALID_FIELD = {
  key: 'company_name',
  label: 'Company Name',
  type: 'string',
  required: true,
  instructions: 'Extract the official company name',
};

const VALID_ENUM_FIELD = {
  key: 'industry',
  label: 'Industry',
  type: 'enum',
  required: true,
  instructions: 'Select the industry',
  enumOptions: ['tech', 'finance', 'healthcare'],
};

function postSchemas(app: ReturnType<typeof createSchemaTestApp>, body: unknown) {
  return app.request('/api/schemas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function postVersion(app: ReturnType<typeof createSchemaTestApp>, schemaId: string, body: unknown) {
  return app.request(`/api/schemas/${schemaId}/versions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function getVersion(app: ReturnType<typeof createSchemaTestApp>, schemaId: string, version: string) {
  return app.request(`/api/schemas/${schemaId}/versions/${version}`);
}

// Shared fixtures used across multiple describe blocks
const EXISTING_SCHEMA: StoredSchema = {
  id: 'schema-existing',
  tenantId: 'tenant-1',
  name: 'Onboarding',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const EXISTING_VERSION: StoredVersion = {
  id: 'version-existing',
  schemaId: 'schema-existing',
  version: 1,
  fields: [VALID_FIELD],
  createdAt: new Date().toISOString(),
  createdBy: 'user-1',
};

// =====================
// POST /api/schemas
// =====================

describe('POST /api/schemas', () => {
  it('creates schema with valid fields → 201', async () => {
    const app = createSchemaTestApp();
    const res = await postSchemas(app, { name: 'Onboarding', fields: [VALID_FIELD] });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.schema.name).toBe('Onboarding');
    expect(body.version.version).toBe(1);
    expect(body.version.fields).toHaveLength(1);
  });

  it('rejects empty name → 400', async () => {
    const app = createSchemaTestApp();
    const res = await postSchemas(app, { name: '', fields: [VALID_FIELD] });
    expect(res.status).toBe(400);
  });

  it('rejects empty fields array → 400', async () => {
    const app = createSchemaTestApp();
    const res = await postSchemas(app, { name: 'Test', fields: [] });
    expect(res.status).toBe(400);
  });

  it('rejects empty key → 400', async () => {
    const app = createSchemaTestApp();
    const res = await postSchemas(app, {
      name: 'Test',
      fields: [{ ...VALID_FIELD, key: '' }],
    });
    expect(res.status).toBe(400);
  });

  it('rejects empty label → 400', async () => {
    const app = createSchemaTestApp();
    const res = await postSchemas(app, {
      name: 'Test',
      fields: [{ ...VALID_FIELD, label: '' }],
    });
    expect(res.status).toBe(400);
  });

  it('rejects empty instructions → 400', async () => {
    const app = createSchemaTestApp();
    const res = await postSchemas(app, {
      name: 'Test',
      fields: [{ ...VALID_FIELD, instructions: '' }],
    });
    expect(res.status).toBe(400);
  });

  it('rejects invalid field type → 400', async () => {
    const app = createSchemaTestApp();
    const res = await postSchemas(app, {
      name: 'Test',
      fields: [{ ...VALID_FIELD, type: 'date' }],
    });
    expect(res.status).toBe(400);
  });

  it('rejects enum without enumOptions → 400', async () => {
    const app = createSchemaTestApp();
    const res = await postSchemas(app, {
      name: 'Test',
      fields: [{ ...VALID_ENUM_FIELD, enumOptions: undefined }],
    });
    expect(res.status).toBe(400);
  });

  it('rejects enum with empty enumOptions → 400', async () => {
    const app = createSchemaTestApp();
    const res = await postSchemas(app, {
      name: 'Test',
      fields: [{ ...VALID_ENUM_FIELD, enumOptions: [] }],
    });
    expect(res.status).toBe(400);
  });

  it('rejects invalid regex in validation → 400', async () => {
    const app = createSchemaTestApp();
    const res = await postSchemas(app, {
      name: 'Test',
      fields: [{ ...VALID_FIELD, validation: { regex: '[invalid(' } }],
    });
    expect(res.status).toBe(400);
  });

  it('rejects ReDoS-vulnerable regex patterns → 400', async () => {
    const app = createSchemaTestApp();
    const res = await postSchemas(app, {
      name: 'Test',
      fields: [{ ...VALID_FIELD, validation: { regex: '(a+)+b' } }],
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.details.fieldErrors.fields[0]).toContain('ReDoS');
  });

  it('rejects minLen > maxLen → 400', async () => {
    const app = createSchemaTestApp();
    const res = await postSchemas(app, {
      name: 'Test',
      fields: [{ ...VALID_FIELD, validation: { minLen: 10, maxLen: 5 } }],
    });
    expect(res.status).toBe(400);
  });

  it('rejects duplicate field keys → 400', async () => {
    const app = createSchemaTestApp();
    const res = await postSchemas(app, {
      name: 'Test',
      fields: [VALID_FIELD, { ...VALID_FIELD }],
    });
    expect(res.status).toBe(400);
  });

  it('rejects confidenceThreshold out of range → 400', async () => {
    const app = createSchemaTestApp();
    const res = await postSchemas(app, {
      name: 'Test',
      fields: [{ ...VALID_FIELD, confidenceThreshold: 1.5 }],
    });
    expect(res.status).toBe(400);
  });

  it('accepts valid enum field with enumOptions', async () => {
    const app = createSchemaTestApp();
    const res = await postSchemas(app, {
      name: 'Test',
      fields: [VALID_ENUM_FIELD],
    });
    expect(res.status).toBe(201);
  });

  it('rejects instructions exceeding max length → 400', async () => {
    const app = createSchemaTestApp();
    const res = await postSchemas(app, {
      name: 'Test',
      fields: [{ ...VALID_FIELD, instructions: 'x'.repeat(2001) }],
    });
    expect(res.status).toBe(400);
  });

  it('rejects key exceeding max length → 400', async () => {
    const app = createSchemaTestApp();
    const res = await postSchemas(app, {
      name: 'Test',
      fields: [{ ...VALID_FIELD, key: 'k'.repeat(101) }],
    });
    expect(res.status).toBe(400);
  });

  it('rejects more than 100 fields → 400', async () => {
    const app = createSchemaTestApp();
    const fields = Array.from({ length: 101 }, (_, i) => ({
      ...VALID_FIELD,
      key: `field_${i}`,
    }));
    const res = await postSchemas(app, { name: 'Test', fields });
    expect(res.status).toBe(400);
  });

  it('rejects sourceHints with empty strings → 400', async () => {
    const app = createSchemaTestApp();
    const res = await postSchemas(app, {
      name: 'Test',
      fields: [{ ...VALID_FIELD, sourceHints: ['valid', ''] }],
    });
    expect(res.status).toBe(400);
  });

  it('rejects schema name exceeding max length → 400', async () => {
    const app = createSchemaTestApp();
    const res = await postSchemas(app, {
      name: 'n'.repeat(201),
      fields: [VALID_FIELD],
    });
    expect(res.status).toBe(400);
  });
});

// =====================
// POST /api/schemas/:schemaId/versions
// =====================

describe('POST /api/schemas/:schemaId/versions', () => {
  it('creates version 2 when v1 exists → 201', async () => {
    const app = createSchemaTestApp({
      schemas: [EXISTING_SCHEMA],
      versions: [EXISTING_VERSION],
    });
    const res = await postVersion(app, 'schema-existing', {
      fields: [{ ...VALID_FIELD, key: 'updated_name' }],
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.version.version).toBe(2);
  });

  it('returns 404 for non-existent schemaId', async () => {
    const app = createSchemaTestApp();
    const res = await postVersion(app, 'nonexistent', { fields: [VALID_FIELD] });
    expect(res.status).toBe(404);
  });

  it('returns 404 for schema in different tenant', async () => {
    const otherTenantSchema: StoredSchema = {
      ...EXISTING_SCHEMA,
      tenantId: 'other-tenant',
    };
    const app = createSchemaTestApp({
      schemas: [otherTenantSchema],
      versions: [EXISTING_VERSION],
    });
    const res = await postVersion(app, 'schema-existing', { fields: [VALID_FIELD] });
    expect(res.status).toBe(404);
  });

  it('rejects invalid fields (empty array) → 400', async () => {
    const app = createSchemaTestApp({
      schemas: [EXISTING_SCHEMA],
      versions: [EXISTING_VERSION],
    });
    const res = await postVersion(app, 'schema-existing', { fields: [] });
    expect(res.status).toBe(400);
  });
});

// =====================
// GET /api/schemas/:schemaId/versions/:version
// =====================

describe('GET /api/schemas/:schemaId/versions/:version', () => {
  it('retrieves existing version → 200', async () => {
    const app = createSchemaTestApp({
      schemas: [EXISTING_SCHEMA],
      versions: [EXISTING_VERSION],
    });
    const res = await getVersion(app, 'schema-existing', '1');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.version.version).toBe(1);
    expect(body.version.fields).toHaveLength(1);
  });

  it('returns 404 for non-existent version', async () => {
    const app = createSchemaTestApp({
      schemas: [EXISTING_SCHEMA],
      versions: [EXISTING_VERSION],
    });
    const res = await getVersion(app, 'schema-existing', '99');
    expect(res.status).toBe(404);
  });

  it('returns 404 for non-existent schema', async () => {
    const app = createSchemaTestApp();
    const res = await getVersion(app, 'nonexistent', '1');
    expect(res.status).toBe(404);
  });

  it('returns 400 for non-numeric version param', async () => {
    const app = createSchemaTestApp({
      schemas: [EXISTING_SCHEMA],
      versions: [EXISTING_VERSION],
    });
    const res = await getVersion(app, 'schema-existing', 'abc');
    expect(res.status).toBe(400);
  });

  it('returns 400 for negative version param', async () => {
    const app = createSchemaTestApp({
      schemas: [EXISTING_SCHEMA],
      versions: [EXISTING_VERSION],
    });
    const res = await getVersion(app, 'schema-existing', '-1');
    expect(res.status).toBe(400);
  });

  it('returns 404 for schema in different tenant', async () => {
    const otherTenantSchema: StoredSchema = {
      ...EXISTING_SCHEMA,
      tenantId: 'other-tenant',
    };
    const app = createSchemaTestApp({
      schemas: [otherTenantSchema],
      versions: [EXISTING_VERSION],
    });
    const res = await getVersion(app, 'schema-existing', '1');
    expect(res.status).toBe(404);
  });
});
