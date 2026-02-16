import { describe, it, expect } from 'bun:test';
import { Hono } from 'hono';
import { z } from 'zod';
import { errorHandler } from '../../src/middleware/error-handler';
import { ValidationError, NotFoundError } from '../../src/lib/errors';
import {
  generatePublishableKey,
  hashPublishableKey,
  extractKeyPrefix,
} from '../../src/lib/publishable-keys';

/**
 * Publishable keys route tests.
 * Stub-based: builds a minimal Hono app that replicates route behavior.
 */

interface StoredPublishableKey {
  id: string;
  tenantId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  environment: 'live' | 'test';
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

interface AuditLogEntry {
  event: string;
  resourceId: string;
}

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  environment: z.enum(['live', 'test']),
});

type TestEnv = {
  Variables: {
    tenantId: string;
    user: { id: string };
  };
};

function createPublishableKeysTestApp(options: {
  keys?: StoredPublishableKey[];
  tenantId?: string;
  userId?: string;
} = {}) {
  const tenantId = options.tenantId ?? 'tenant-1';
  const userId = options.userId ?? 'user-1';
  const storedKeys: StoredPublishableKey[] = options.keys ? [...options.keys] : [];
  const auditLogs: AuditLogEntry[] = [];
  let nextKeyNum = storedKeys.length + 1;

  const makeKeyUuid = (n: number) => `60000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

  const app = new Hono<TestEnv>();
  app.onError(errorHandler);

  // Stub context variables
  app.use('*', async (c, next) => {
    c.set('tenantId', tenantId);
    c.set('user', { id: userId });
    await next();
  });

  // POST /api/publishable-keys
  app.post('/api/publishable-keys', async (c) => {
    const body = await c.req.json();
    const parsed = createKeySchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.flatten());
    }

    const rawKey = generatePublishableKey(parsed.data.environment);
    const keyHash = hashPublishableKey(rawKey);
    const keyPrefix = extractKeyPrefix(rawKey);

    const key: StoredPublishableKey = {
      id: makeKeyUuid(nextKeyNum++),
      tenantId,
      name: parsed.data.name,
      keyHash,
      keyPrefix,
      environment: parsed.data.environment,
      lastUsedAt: null,
      revokedAt: null,
      createdAt: new Date().toISOString(),
    };
    storedKeys.push(key);

    auditLogs.push({ event: 'publishable_key.created', resourceId: key.id });

    return c.json(
      {
        key: {
          id: key.id,
          name: key.name,
          rawKey,
          keyPrefix: key.keyPrefix,
          environment: key.environment,
          createdAt: key.createdAt,
        },
      },
      201,
    );
  });

  // GET /api/publishable-keys
  app.get('/api/publishable-keys', async (c) => {
    const results = storedKeys.filter(
      (k) => k.tenantId === tenantId && k.revokedAt === null,
    );

    return c.json({
      keys: results.map((k) => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        environment: k.environment,
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
      })),
    });
  });

  // DELETE /api/publishable-keys/:id
  app.delete('/api/publishable-keys/:id', async (c) => {
    const keyId = c.req.param('id');

    // Validate UUID format (simple check)
    if (!keyId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      throw new ValidationError('Invalid key ID format');
    }

    const key = storedKeys.find((k) => k.id === keyId && k.tenantId === tenantId);

    if (!key) {
      throw new NotFoundError('Publishable key not found');
    }

    key.revokedAt = new Date().toISOString();

    auditLogs.push({ event: 'publishable_key.revoked', resourceId: keyId });

    return c.body(null, 204);
  });

  return { app, storedKeys, auditLogs };
}

// --- Helpers ---

function postKey(app: Hono<TestEnv>, body: unknown) {
  return app.request('/api/publishable-keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function getKeys(app: Hono<TestEnv>) {
  return app.request('/api/publishable-keys');
}

function deleteKey(app: Hono<TestEnv>, keyId: string) {
  return app.request(`/api/publishable-keys/${keyId}`, { method: 'DELETE' });
}

// =====================
// POST /api/publishable-keys
// =====================

describe('POST /api/publishable-keys', () => {
  it('creates key with valid body → 201', async () => {
    const { app } = createPublishableKeysTestApp();
    const res = await postKey(app, {
      name: 'Production API',
      environment: 'live',
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.key.id).toBeDefined();
    expect(body.key.name).toBe('Production API');
    expect(body.key.rawKey).toBeDefined();
    expect(body.key.rawKey).toMatch(/^pk_live_[a-zA-Z0-9]{32}$/);
    expect(body.key.keyPrefix).toBe(body.key.rawKey.slice(0, 12));
    expect(body.key.environment).toBe('live');
    expect(body.key.createdAt).toBeDefined();
  });

  it('creates test environment key', async () => {
    const { app } = createPublishableKeysTestApp();
    const res = await postKey(app, {
      name: 'Test API',
      environment: 'test',
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.key.rawKey).toMatch(/^pk_test_[a-zA-Z0-9]{32}$/);
    expect(body.key.environment).toBe('test');
  });

  it('rejects missing name → 400', async () => {
    const { app } = createPublishableKeysTestApp();
    const res = await postKey(app, {
      environment: 'live',
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects empty name → 400', async () => {
    const { app } = createPublishableKeysTestApp();
    const res = await postKey(app, {
      name: '',
      environment: 'live',
    });

    expect(res.status).toBe(400);
  });

  it('rejects name longer than 100 chars → 400', async () => {
    const { app } = createPublishableKeysTestApp();
    const res = await postKey(app, {
      name: 'a'.repeat(101),
      environment: 'live',
    });

    expect(res.status).toBe(400);
  });

  it('rejects invalid environment → 400', async () => {
    const { app } = createPublishableKeysTestApp();
    const res = await postKey(app, {
      name: 'My Key',
      environment: 'production',
    });

    expect(res.status).toBe(400);
  });

  it('rejects missing environment → 400', async () => {
    const { app } = createPublishableKeysTestApp();
    const res = await postKey(app, {
      name: 'My Key',
    });

    expect(res.status).toBe(400);
  });

  it('returns raw key in response', async () => {
    const { app } = createPublishableKeysTestApp();
    const res = await postKey(app, {
      name: 'My Key',
      environment: 'live',
    });

    const body = await res.json();
    expect(body.key.rawKey).toBeDefined();
    expect(typeof body.key.rawKey).toBe('string');
    expect(body.key.rawKey.length).toBeGreaterThan(0);
  });

  it('logs audit event on key creation', async () => {
    const { app, auditLogs } = createPublishableKeysTestApp();
    await postKey(app, {
      name: 'My Key',
      environment: 'live',
    });

    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].event).toBe('publishable_key.created');
  });
});

// =====================
// GET /api/publishable-keys
// =====================

describe('GET /api/publishable-keys', () => {
  it('returns empty array when no keys', async () => {
    const { app } = createPublishableKeysTestApp();
    const res = await getKeys(app);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.keys).toEqual([]);
  });

  it('returns active keys for tenant', async () => {
    const existingKey: StoredPublishableKey = {
      id: '60000000-0000-0000-0000-000000000001',
      tenantId: 'tenant-1',
      name: 'Production Key',
      keyHash: hashPublishableKey('pk_live_test123'),
      keyPrefix: 'pk_live_test',
      environment: 'live',
      lastUsedAt: '2025-01-15T00:00:00Z',
      revokedAt: null,
      createdAt: '2025-01-01T00:00:00Z',
    };
    const { app } = createPublishableKeysTestApp({ keys: [existingKey] });

    const res = await getKeys(app);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.keys).toHaveLength(1);
    expect(body.keys[0].id).toBe(existingKey.id);
    expect(body.keys[0].name).toBe('Production Key');
    expect(body.keys[0].keyPrefix).toBe('pk_live_test');
    expect(body.keys[0].environment).toBe('live');
    expect(body.keys[0].lastUsedAt).toBe('2025-01-15T00:00:00Z');
    expect(body.keys[0].createdAt).toBe('2025-01-01T00:00:00Z');
  });

  it('never exposes key hashes', async () => {
    const existingKey: StoredPublishableKey = {
      id: '60000000-0000-0000-0000-000000000001',
      tenantId: 'tenant-1',
      name: 'Production Key',
      keyHash: hashPublishableKey('pk_live_secret'),
      keyPrefix: 'pk_live_secr',
      environment: 'live',
      lastUsedAt: null,
      revokedAt: null,
      createdAt: '2025-01-01T00:00:00Z',
    };
    const { app } = createPublishableKeysTestApp({ keys: [existingKey] });

    const res = await getKeys(app);
    const body = await res.json();
    expect(body.keys[0].keyHash).toBeUndefined();
    expect(body.keys[0].rawKey).toBeUndefined();
  });

  it('does not return revoked keys', async () => {
    const revokedKey: StoredPublishableKey = {
      id: '60000000-0000-0000-0000-000000000001',
      tenantId: 'tenant-1',
      name: 'Revoked Key',
      keyHash: hashPublishableKey('pk_live_revoked'),
      keyPrefix: 'pk_live_revo',
      environment: 'live',
      lastUsedAt: null,
      revokedAt: '2025-01-10T00:00:00Z',
      createdAt: '2025-01-01T00:00:00Z',
    };
    const { app } = createPublishableKeysTestApp({ keys: [revokedKey] });

    const res = await getKeys(app);
    const body = await res.json();
    expect(body.keys).toHaveLength(0);
  });

  it('does not return keys from other tenants', async () => {
    const otherTenantKey: StoredPublishableKey = {
      id: '60000000-0000-0000-0000-000000000001',
      tenantId: 'other-tenant',
      name: 'Other Tenant Key',
      keyHash: hashPublishableKey('pk_live_other'),
      keyPrefix: 'pk_live_othe',
      environment: 'live',
      lastUsedAt: null,
      revokedAt: null,
      createdAt: '2025-01-01T00:00:00Z',
    };
    const { app } = createPublishableKeysTestApp({ keys: [otherTenantKey] });

    const res = await getKeys(app);
    const body = await res.json();
    expect(body.keys).toHaveLength(0);
  });

  it('returns multiple keys', async () => {
    const keys: StoredPublishableKey[] = [
      {
        id: '60000000-0000-0000-0000-000000000001',
        tenantId: 'tenant-1',
        name: 'Live Key',
        keyHash: hashPublishableKey('pk_live_key1'),
        keyPrefix: 'pk_live_key1',
        environment: 'live',
        lastUsedAt: null,
        revokedAt: null,
        createdAt: '2025-01-01T00:00:00Z',
      },
      {
        id: '60000000-0000-0000-0000-000000000002',
        tenantId: 'tenant-1',
        name: 'Test Key',
        keyHash: hashPublishableKey('pk_test_key2'),
        keyPrefix: 'pk_test_key2',
        environment: 'test',
        lastUsedAt: null,
        revokedAt: null,
        createdAt: '2025-01-02T00:00:00Z',
      },
    ];
    const { app } = createPublishableKeysTestApp({ keys });

    const res = await getKeys(app);
    const body = await res.json();
    expect(body.keys).toHaveLength(2);
  });
});

// =====================
// DELETE /api/publishable-keys/:id
// =====================

describe('DELETE /api/publishable-keys/:id', () => {
  it('revokes key → 204', async () => {
    const existingKey: StoredPublishableKey = {
      id: '60000000-0000-0000-0000-000000000001',
      tenantId: 'tenant-1',
      name: 'Production Key',
      keyHash: hashPublishableKey('pk_live_test'),
      keyPrefix: 'pk_live_test',
      environment: 'live',
      lastUsedAt: null,
      revokedAt: null,
      createdAt: '2025-01-01T00:00:00Z',
    };
    const { app, storedKeys } = createPublishableKeysTestApp({ keys: [existingKey] });

    const res = await deleteKey(app, existingKey.id);

    expect(res.status).toBe(204);
    expect(storedKeys[0].revokedAt).not.toBeNull();
  });

  it('returns 404 for nonexistent key', async () => {
    const { app } = createPublishableKeysTestApp();
    const res = await deleteKey(app, '60000000-0000-0000-0000-000000000001');

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for invalid ID format', async () => {
    const { app } = createPublishableKeysTestApp();
    const res = await deleteKey(app, 'not-a-uuid');

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 for key in different tenant', async () => {
    const otherTenantKey: StoredPublishableKey = {
      id: '60000000-0000-0000-0000-000000000001',
      tenantId: 'other-tenant',
      name: 'Other Tenant Key',
      keyHash: hashPublishableKey('pk_live_other'),
      keyPrefix: 'pk_live_othe',
      environment: 'live',
      lastUsedAt: null,
      revokedAt: null,
      createdAt: '2025-01-01T00:00:00Z',
    };
    const { app } = createPublishableKeysTestApp({ keys: [otherTenantKey] });

    const res = await deleteKey(app, otherTenantKey.id);

    expect(res.status).toBe(404);
  });

  it('logs audit event on key revocation', async () => {
    const existingKey: StoredPublishableKey = {
      id: '60000000-0000-0000-0000-000000000001',
      tenantId: 'tenant-1',
      name: 'Production Key',
      keyHash: hashPublishableKey('pk_live_test'),
      keyPrefix: 'pk_live_test',
      environment: 'live',
      lastUsedAt: null,
      revokedAt: null,
      createdAt: '2025-01-01T00:00:00Z',
    };
    const { app, auditLogs } = createPublishableKeysTestApp({ keys: [existingKey] });

    await deleteKey(app, existingKey.id);

    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].event).toBe('publishable_key.revoked');
    expect(auditLogs[0].resourceId).toBe(existingKey.id);
  });
});
