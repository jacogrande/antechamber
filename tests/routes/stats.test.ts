import { describe, it, expect } from 'bun:test';
import { Hono } from 'hono';
import { errorHandler } from '../../src/middleware/error-handler';

/**
 * Stats route tests.
 *
 * Stub-based: builds a minimal Hono app that replicates route behavior
 * without depending on a real database.
 */

interface StoredSchema {
  id: string;
  tenantId: string;
  name: string;
}

interface StoredSubmission {
  id: string;
  tenantId: string;
  schemaId: string;
  status: string;
}

interface StoredWebhook {
  id: string;
  tenantId: string;
  isActive: boolean;
}

interface StoredTenant {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

function createStatsTestApp(options: {
  schemas?: StoredSchema[];
  submissions?: StoredSubmission[];
  webhooks?: StoredWebhook[];
  tenants?: StoredTenant[];
  tenantId?: string;
} = {}) {
  const tenantId = options.tenantId ?? 'tenant-1';
  const storedSchemas: StoredSchema[] = options.schemas ? [...options.schemas] : [];
  const storedSubmissions: StoredSubmission[] = options.submissions ? [...options.submissions] : [];
  const storedWebhooks: StoredWebhook[] = options.webhooks ? [...options.webhooks] : [];
  const storedTenants: StoredTenant[] = options.tenants ? [...options.tenants] : [];

  const app = new Hono();
  app.onError(errorHandler);

  // GET /api/stats
  app.get('/api/stats', async (c) => {
    const tenantSchemas = storedSchemas.filter((s) => s.tenantId === tenantId);
    const tenantSubmissions = storedSubmissions.filter((s) => s.tenantId === tenantId);
    const tenantWebhooks = storedWebhooks.filter((w) => w.tenantId === tenantId && w.isActive);

    return c.json({
      schemas: { total: tenantSchemas.length },
      submissions: {
        total: tenantSubmissions.length,
        pending: tenantSubmissions.filter((s) => s.status === 'pending').length,
        draft: tenantSubmissions.filter((s) => s.status === 'draft').length,
        confirmed: tenantSubmissions.filter((s) => s.status === 'confirmed').length,
        failed: tenantSubmissions.filter((s) => s.status === 'failed').length,
      },
      webhooks: { active: tenantWebhooks.length },
    });
  });

  // GET /api/tenant
  app.get('/api/tenant', async (c) => {
    const tenant = storedTenants.find((t) => t.id === tenantId);

    if (!tenant) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Tenant not found' } }, 404);
    }

    return c.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        createdAt: tenant.createdAt,
      },
    });
  });

  return app;
}

// =====================
// GET /api/stats
// =====================

describe('GET /api/stats', () => {
  it('returns correct counts when data exists', async () => {
    const app = createStatsTestApp({
      schemas: [
        { id: 's1', tenantId: 'tenant-1', name: 'Schema 1' },
        { id: 's2', tenantId: 'tenant-1', name: 'Schema 2' },
      ],
      submissions: [
        { id: 'sub1', tenantId: 'tenant-1', schemaId: 's1', status: 'pending' },
        { id: 'sub2', tenantId: 'tenant-1', schemaId: 's1', status: 'draft' },
        { id: 'sub3', tenantId: 'tenant-1', schemaId: 's1', status: 'confirmed' },
        { id: 'sub4', tenantId: 'tenant-1', schemaId: 's2', status: 'confirmed' },
        { id: 'sub5', tenantId: 'tenant-1', schemaId: 's2', status: 'failed' },
      ],
      webhooks: [
        { id: 'w1', tenantId: 'tenant-1', isActive: true },
        { id: 'w2', tenantId: 'tenant-1', isActive: false },
        { id: 'w3', tenantId: 'tenant-1', isActive: true },
      ],
    });

    const res = await app.request('/api/stats');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.schemas.total).toBe(2);
    expect(body.submissions.total).toBe(5);
    expect(body.submissions.pending).toBe(1);
    expect(body.submissions.draft).toBe(1);
    expect(body.submissions.confirmed).toBe(2);
    expect(body.submissions.failed).toBe(1);
    expect(body.webhooks.active).toBe(2);
  });

  it('returns all zeros when no data exists', async () => {
    const app = createStatsTestApp();
    const res = await app.request('/api/stats');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.schemas.total).toBe(0);
    expect(body.submissions.total).toBe(0);
    expect(body.submissions.pending).toBe(0);
    expect(body.submissions.draft).toBe(0);
    expect(body.submissions.confirmed).toBe(0);
    expect(body.submissions.failed).toBe(0);
    expect(body.webhooks.active).toBe(0);
  });

  it('counts only data for current tenant (tenant isolation)', async () => {
    const app = createStatsTestApp({
      schemas: [
        { id: 's1', tenantId: 'tenant-1', name: 'My Schema' },
        { id: 's2', tenantId: 'other-tenant', name: 'Other Schema' },
      ],
      submissions: [
        { id: 'sub1', tenantId: 'tenant-1', schemaId: 's1', status: 'confirmed' },
        { id: 'sub2', tenantId: 'other-tenant', schemaId: 's2', status: 'confirmed' },
        { id: 'sub3', tenantId: 'other-tenant', schemaId: 's2', status: 'draft' },
      ],
      webhooks: [
        { id: 'w1', tenantId: 'tenant-1', isActive: true },
        { id: 'w2', tenantId: 'other-tenant', isActive: true },
      ],
    });

    const res = await app.request('/api/stats');
    const body = await res.json();
    expect(body.schemas.total).toBe(1);
    expect(body.submissions.total).toBe(1);
    expect(body.submissions.confirmed).toBe(1);
    expect(body.webhooks.active).toBe(1);
  });

  it('submission status breakdown is accurate', async () => {
    const app = createStatsTestApp({
      submissions: [
        { id: 'sub1', tenantId: 'tenant-1', schemaId: 's1', status: 'pending' },
        { id: 'sub2', tenantId: 'tenant-1', schemaId: 's1', status: 'pending' },
        { id: 'sub3', tenantId: 'tenant-1', schemaId: 's1', status: 'draft' },
        { id: 'sub4', tenantId: 'tenant-1', schemaId: 's1', status: 'draft' },
        { id: 'sub5', tenantId: 'tenant-1', schemaId: 's1', status: 'draft' },
        { id: 'sub6', tenantId: 'tenant-1', schemaId: 's1', status: 'confirmed' },
        { id: 'sub7', tenantId: 'tenant-1', schemaId: 's1', status: 'failed' },
        { id: 'sub8', tenantId: 'tenant-1', schemaId: 's1', status: 'failed' },
      ],
    });

    const res = await app.request('/api/stats');
    const body = await res.json();
    expect(body.submissions.total).toBe(8);
    expect(body.submissions.pending).toBe(2);
    expect(body.submissions.draft).toBe(3);
    expect(body.submissions.confirmed).toBe(1);
    expect(body.submissions.failed).toBe(2);
  });

  it('only counts active webhooks', async () => {
    const app = createStatsTestApp({
      webhooks: [
        { id: 'w1', tenantId: 'tenant-1', isActive: true },
        { id: 'w2', tenantId: 'tenant-1', isActive: false },
        { id: 'w3', tenantId: 'tenant-1', isActive: false },
        { id: 'w4', tenantId: 'tenant-1', isActive: true },
      ],
    });

    const res = await app.request('/api/stats');
    const body = await res.json();
    expect(body.webhooks.active).toBe(2);
  });
});

// =====================
// GET /api/tenant
// =====================

describe('GET /api/tenant', () => {
  it('returns tenant info for valid tenant', async () => {
    const app = createStatsTestApp({
      tenants: [
        { id: 'tenant-1', name: 'Acme Corp', slug: 'acme-corp', createdAt: '2025-01-01T00:00:00.000Z' },
      ],
    });
    const res = await app.request('/api/tenant');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tenant.name).toBe('Acme Corp');
    expect(body.tenant.slug).toBe('acme-corp');
  });

  it('returns 404 for non-existent tenant', async () => {
    const app = createStatsTestApp({
      tenants: [], // no tenant matches tenantId 'tenant-1'
    });
    const res = await app.request('/api/tenant');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns correct shape { tenant: { id, name, slug, createdAt } }', async () => {
    const app = createStatsTestApp({
      tenants: [
        { id: 'tenant-1', name: 'My Org', slug: 'my-org', createdAt: '2025-06-15T12:00:00.000Z' },
      ],
    });
    const res = await app.request('/api/tenant');
    const body = await res.json();
    expect(body.tenant).toEqual({
      id: 'tenant-1',
      name: 'My Org',
      slug: 'my-org',
      createdAt: '2025-06-15T12:00:00.000Z',
    });
  });
});
