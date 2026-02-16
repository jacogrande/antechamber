import { describe, it, expect } from 'bun:test';
import { Hono } from 'hono';
import { errorHandler } from '../../src/middleware/error-handler';
import { UnauthorizedError } from '../../src/lib/errors';
import { hashPublishableKey } from '../../src/lib/publishable-keys';

/**
 * Publishable key middleware tests.
 * Stub-based: builds a minimal Hono app that replicates middleware behavior.
 */

interface StoredPublishableKey {
  keyHash: string;
  tenantId: string;
  revokedAt: string | null;
}

type TestEnv = {
  Variables: {
    tenantId: string;
  };
};

function createPublishableKeyTestApp(options: {
  keys?: StoredPublishableKey[];
} = {}) {
  const storedKeys: StoredPublishableKey[] = options.keys ? [...options.keys] : [];

  const app = new Hono<TestEnv>();
  app.onError(errorHandler);

  // Middleware that mimics publishable-key middleware
  app.use('*', async (c, next) => {
    const rawKey = c.req.header('X-Publishable-Key');
    if (!rawKey) {
      throw new UnauthorizedError('Missing X-Publishable-Key header');
    }

    const keyHash = hashPublishableKey(rawKey);
    const key = storedKeys.find((k) => k.keyHash === keyHash && k.revokedAt === null);

    if (!key) {
      throw new UnauthorizedError('Invalid or revoked publishable key');
    }

    c.set('tenantId', key.tenantId);
    await next();
  });

  // Test endpoint that returns the tenantId
  app.get('/test', async (c) => {
    const tenantId = c.get('tenantId');
    return c.json({ tenantId });
  });

  return { app, storedKeys };
}

// --- Helpers ---

function getTest(app: Hono<TestEnv>, headers: Record<string, string> = {}) {
  return app.request('/test', { headers });
}

// =====================
// Middleware Tests
// =====================

describe('publishableKeyMiddleware', () => {
  it('allows request with valid key and sets tenantId', async () => {
    const validKey = 'pk_test_abc123';
    const keyHash = hashPublishableKey(validKey);
    const { app } = createPublishableKeyTestApp({
      keys: [
        {
          keyHash,
          tenantId: 'tenant-1',
          revokedAt: null,
        },
      ],
    });

    const res = await getTest(app, { 'X-Publishable-Key': validKey });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tenantId).toBe('tenant-1');
  });

  it('rejects request with missing header', async () => {
    const { app } = createPublishableKeyTestApp();

    const res = await getTest(app);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(body.error.message).toBe('Missing X-Publishable-Key header');
  });

  it('rejects request with key not found', async () => {
    const { app } = createPublishableKeyTestApp({
      keys: [
        {
          keyHash: hashPublishableKey('pk_test_different'),
          tenantId: 'tenant-1',
          revokedAt: null,
        },
      ],
    });

    const res = await getTest(app, { 'X-Publishable-Key': 'pk_test_unknown' });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(body.error.message).toBe('Invalid or revoked publishable key');
  });

  it('rejects request with revoked key', async () => {
    const revokedKey = 'pk_test_revoked';
    const keyHash = hashPublishableKey(revokedKey);
    const { app } = createPublishableKeyTestApp({
      keys: [
        {
          keyHash,
          tenantId: 'tenant-1',
          revokedAt: '2025-01-01T00:00:00Z',
        },
      ],
    });

    const res = await getTest(app, { 'X-Publishable-Key': revokedKey });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(body.error.message).toBe('Invalid or revoked publishable key');
  });
});
