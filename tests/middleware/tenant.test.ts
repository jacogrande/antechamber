import { describe, it, expect } from 'bun:test';
import { Hono } from 'hono';
import { errorHandler } from '../../src/middleware/error-handler';
import { ValidationError, ForbiddenError } from '../../src/lib/errors';

/**
 * Tests for tenant middleware behavior.
 *
 * We build a minimal Hono app that replicates the tenant middleware logic
 * (X-Tenant-ID header check + membership lookup) with controllable stubs.
 */

const VALID_TENANT_ID = 'tenant-001';
const VALID_USER_ID = 'user-001';

function createTenantTestApp(options: {
  membershipExists?: boolean;
  membershipRole?: 'admin' | 'editor' | 'viewer';
} = {}) {
  const { membershipExists = true, membershipRole = 'admin' } = options;

  type Env = {
    Variables: {
      user: { id: string; email: string };
      tenantId: string;
      tenantRole: 'admin' | 'editor' | 'viewer';
    };
  };

  const app = new Hono<Env>();
  app.onError(errorHandler);

  // Simulate auth middleware already ran
  app.use('*', async (c, next) => {
    c.set('user', { id: VALID_USER_ID, email: 'test@example.com' });
    await next();
  });

  // Tenant middleware replica
  app.use('/api/schemas/*', async (c, next) => {
    const tenantId = c.req.header('X-Tenant-ID');
    if (!tenantId) {
      throw new ValidationError('X-Tenant-ID header is required');
    }

    // Simulate membership lookup
    if (!membershipExists || tenantId !== VALID_TENANT_ID) {
      throw new ForbiddenError('Not a member of this tenant');
    }

    c.set('tenantId', tenantId);
    c.set('tenantRole', membershipRole);
    await next();
  });

  app.get('/api/schemas/list', (c) => {
    return c.json({
      tenantId: c.get('tenantId'),
      tenantRole: c.get('tenantRole'),
    });
  });

  return app;
}

describe('Tenant middleware', () => {
  it('returns 400 when X-Tenant-ID header is missing', async () => {
    const app = createTenantTestApp();
    const res = await app.request('/api/schemas/list');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toContain('X-Tenant-ID');
  });

  it('returns 403 when user is not a member of the tenant', async () => {
    const app = createTenantTestApp({ membershipExists: false });
    const res = await app.request('/api/schemas/list', {
      headers: { 'X-Tenant-ID': VALID_TENANT_ID },
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 403 for unknown tenant ID', async () => {
    const app = createTenantTestApp();
    const res = await app.request('/api/schemas/list', {
      headers: { 'X-Tenant-ID': 'wrong-tenant' },
    });
    expect(res.status).toBe(403);
  });

  it('sets tenant context on valid membership', async () => {
    const app = createTenantTestApp({ membershipRole: 'editor' });
    const res = await app.request('/api/schemas/list', {
      headers: { 'X-Tenant-ID': VALID_TENANT_ID },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tenantId).toBe(VALID_TENANT_ID);
    expect(body.tenantRole).toBe('editor');
  });

  it('sets admin role when user is admin', async () => {
    const app = createTenantTestApp({ membershipRole: 'admin' });
    const res = await app.request('/api/schemas/list', {
      headers: { 'X-Tenant-ID': VALID_TENANT_ID },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tenantRole).toBe('admin');
  });
});
