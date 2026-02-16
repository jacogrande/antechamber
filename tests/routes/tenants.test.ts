import { describe, it, expect } from 'bun:test';
import { Hono } from 'hono';
import { errorHandler } from '../../src/middleware/error-handler';
import { ValidationError, ConflictError } from '../../src/lib/errors';
import { createTenantRequestSchema } from '../../src/types/api';
import { generateSlug } from '../../src/lib/utils/slug';

/**
 * Tenant route tests.
 *
 * Stub-based: builds a minimal Hono app that replicates route behavior
 * without depending on a real database.
 */

interface StoredTenant {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

interface StoredMembership {
  tenantId: string;
  userId: string;
  role: string;
}

interface StoredUser {
  id: string;
  email: string;
  name: string | null;
}

function createTenantsTestApp(options: {
  tenants?: StoredTenant[];
  memberships?: StoredMembership[];
  users?: StoredUser[];
  userId?: string;
} = {}) {
  const userId = options.userId ?? 'user-1';
  const storedTenants: StoredTenant[] = options.tenants ? [...options.tenants] : [];
  const storedMemberships: StoredMembership[] = options.memberships ? [...options.memberships] : [];
  const storedUsers: StoredUser[] = options.users
    ? [...options.users]
    : [{ id: userId, email: 'test@example.com', name: 'Test User' }];
  let nextTenantNum = storedTenants.length + 1;

  const app = new Hono();
  app.onError(errorHandler);

  // POST /api/tenants
  app.post('/api/tenants', async (c) => {
    const body = await c.req.json();
    const parsed = createTenantRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.flatten().fieldErrors);
    }

    const { name, slug: providedSlug } = parsed.data;
    const slug = providedSlug ?? generateSlug(name);

    if (!slug) {
      throw new ValidationError('Unable to generate a valid slug from the provided name');
    }

    // Look up user
    const user = storedUsers.find((u) => u.id === userId);
    if (!user) {
      throw new ValidationError('User not found');
    }

    // Check for duplicate slug
    if (storedTenants.some((t) => t.slug === slug)) {
      throw new ConflictError('An organization with this slug already exists');
    }

    const tenant: StoredTenant = {
      id: `tenant-${nextTenantNum++}`,
      name,
      slug,
      createdAt: new Date().toISOString(),
    };
    storedTenants.push(tenant);

    const membership: StoredMembership = {
      tenantId: tenant.id,
      userId: user.id,
      role: 'admin',
    };
    storedMemberships.push(membership);

    return c.json(
      {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          createdAt: tenant.createdAt,
        },
        membership: {
          role: 'admin' as const,
        },
      },
      201,
    );
  });

  return { app, storedTenants, storedMemberships };
}

// --- Helpers ---

function postTenants(app: Hono, body: unknown) {
  return app.request('/api/tenants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// =====================
// POST /api/tenants
// =====================

describe('POST /api/tenants', () => {
  it('creates tenant with provided name, generates slug → 201', async () => {
    const { app } = createTenantsTestApp();
    const res = await postTenants(app, { name: 'Acme Corp' });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.tenant.name).toBe('Acme Corp');
    expect(body.tenant.slug).toBe('acme-corp');
    expect(body.tenant.id).toBeDefined();
    expect(body.tenant.createdAt).toBeDefined();
  });

  it('creates admin membership for authenticated user', async () => {
    const { app, storedMemberships } = createTenantsTestApp();
    await postTenants(app, { name: 'Test Org' });
    expect(storedMemberships).toHaveLength(1);
    expect(storedMemberships[0].role).toBe('admin');
    expect(storedMemberships[0].userId).toBe('user-1');
  });

  it('returns 201 with { tenant, membership } shape', async () => {
    const { app } = createTenantsTestApp();
    const res = await postTenants(app, { name: 'My Org' });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.tenant).toBeDefined();
    expect(body.membership).toBeDefined();
    expect(body.membership.role).toBe('admin');
  });

  it('uses provided slug when given', async () => {
    const { app } = createTenantsTestApp();
    const res = await postTenants(app, { name: 'Acme Corp', slug: 'custom-slug' });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.tenant.slug).toBe('custom-slug');
  });

  it('returns 400 for missing name', async () => {
    const { app } = createTenantsTestApp();
    const res = await postTenants(app, {});
    expect(res.status).toBe(400);
  });

  it('returns 400 for empty name', async () => {
    const { app } = createTenantsTestApp();
    const res = await postTenants(app, { name: '' });
    expect(res.status).toBe(400);
  });

  it('returns 409 for duplicate slug', async () => {
    const { app } = createTenantsTestApp({
      tenants: [{ id: 'existing', name: 'Existing', slug: 'acme-corp', createdAt: '2025-01-01T00:00:00.000Z' }],
    });
    const res = await postTenants(app, { name: 'Acme Corp' });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.message).toContain('slug already exists');
  });

  it('generates correct slug from name (lowercase, hyphens, trimmed)', async () => {
    const { app } = createTenantsTestApp();
    const res = await postTenants(app, { name: '  Hello World!  ' });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.tenant.slug).toBe('hello-world');
  });

  it('handles names that generate empty slugs → 400', async () => {
    const { app } = createTenantsTestApp();
    // A name of only special characters generates an empty slug
    const res = await postTenants(app, { name: '!!!' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for name exceeding max length', async () => {
    const { app } = createTenantsTestApp();
    const res = await postTenants(app, { name: 'a'.repeat(101) });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid slug format', async () => {
    const { app } = createTenantsTestApp();
    const res = await postTenants(app, { name: 'Test', slug: 'INVALID_SLUG!' });
    expect(res.status).toBe(400);
  });
});
