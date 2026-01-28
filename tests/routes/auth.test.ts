import { describe, it, expect } from 'bun:test';
import { Hono } from 'hono';
import { loginRequestSchema } from '../../src/types/api';
import { errorHandler } from '../../src/middleware/error-handler';
import { ValidationError, UnauthorizedError } from '../../src/lib/errors';

/**
 * Auth route tests.
 *
 * These test the login/logout endpoints in isolation by building a minimal
 * Hono app that replicates the auth route behavior without depending on
 * Supabase or a real database.
 */

// Build a test app that mimics auth routes with controllable stubs
function createAuthTestApp(options: {
  signInResult?: { error?: { message: string }; data?: { session: { access_token: string; refresh_token: string }; user: { id: string; email: string; user_metadata: { name?: string } } } };
  existingUser?: { id: string; email: string } | null;
  memberships?: Array<{ tenantId: string; tenantName: string; tenantSlug: string; role: string }>;
}) {
  const app = new Hono();
  app.onError(errorHandler);

  app.post('/api/auth/login', async (c) => {
    const body = await c.req.json();
    const parsed = loginRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.flatten().fieldErrors);
    }

    const result = options.signInResult;
    if (result?.error || !result?.data?.session) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const userId = options.existingUser?.id ?? 'new-user-id';
    const memberships = options.memberships ?? [];

    return c.json({
      accessToken: result.data.session.access_token,
      refreshToken: result.data.session.refresh_token,
      user: {
        id: userId,
        email: result.data.user.email,
        name: result.data.user.user_metadata?.name ?? null,
      },
      tenants: memberships.map((m) => ({
        id: m.tenantId,
        name: m.tenantName,
        slug: m.tenantSlug,
        role: m.role,
      })),
    });
  });

  app.post('/api/auth/logout', async (c) => {
    return c.json({ success: true });
  });

  return app;
}

describe('POST /api/auth/login', () => {
  it('returns 400 for invalid request body', async () => {
    const app = createAuthTestApp({});
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 for invalid credentials', async () => {
    const app = createAuthTestApp({
      signInResult: { error: { message: 'Invalid login credentials' } },
    });
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com', password: 'wrong' }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns tokens and user on successful login', async () => {
    const app = createAuthTestApp({
      signInResult: {
        data: {
          session: { access_token: 'access-token-123', refresh_token: 'refresh-token-456' },
          user: { id: 'auth-id', email: 'user@example.com', user_metadata: { name: 'Test' } },
        },
      },
      existingUser: { id: 'user-id-1', email: 'user@example.com' },
      memberships: [
        { tenantId: 'tenant-1', tenantName: 'Acme', tenantSlug: 'acme', role: 'admin' },
      ],
    });

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com', password: 'correct' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.accessToken).toBe('access-token-123');
    expect(body.refreshToken).toBe('refresh-token-456');
    expect(body.user.id).toBe('user-id-1');
    expect(body.user.email).toBe('user@example.com');
    expect(body.tenants).toHaveLength(1);
    expect(body.tenants[0].role).toBe('admin');
  });
});

describe('POST /api/auth/logout', () => {
  it('returns success true', async () => {
    const app = createAuthTestApp({});
    const res = await app.request('/api/auth/logout', { method: 'POST' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true });
  });
});
