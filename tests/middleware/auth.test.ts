import { describe, it, expect, beforeAll } from 'bun:test';
import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import { sign } from 'hono/utils/jwt/jwt';
import { errorHandler } from '../../src/middleware/error-handler';
import { AppError, UnauthorizedError } from '../../src/lib/errors';

const JWT_SECRET = 'test-secret-that-is-long-enough-for-hs256';

/**
 * Tests for auth middleware behavior.
 *
 * We build a minimal Hono app with JWT verification matching
 * the real auth middleware's approach, without needing a DB.
 */
function createJwtTestApp() {
  type Env = {
    Variables: {
      jwtPayload: Record<string, unknown>;
      user: { id: string; email: string };
    };
  };

  const app = new Hono<Env>();
  app.onError(errorHandler);

  // Simulates our auth middleware: JWT verify + user resolution
  app.use('/api/*', async (c, next) => {
    // Skip login
    if (c.req.path === '/api/auth/login' && c.req.method === 'POST') {
      return next();
    }

    const jwtMiddleware = jwt({ secret: JWT_SECRET, alg: 'HS256' });
    try {
      await jwtMiddleware(c, async () => {});
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }

    const payload = c.get('jwtPayload') as Record<string, unknown>;
    const sub = payload.sub as string | undefined;
    if (!sub) {
      throw new UnauthorizedError('Token missing subject');
    }

    // Simulate user lookup
    c.set('user', { id: 'user-123', email: 'test@example.com' });
    await next();
  });

  app.get('/api/protected', (c) => {
    const user = c.get('user');
    return c.json({ userId: user.id, email: user.email });
  });

  app.post('/api/auth/login', (c) => {
    return c.json({ public: true });
  });

  return app;
}

describe('Auth middleware', () => {
  it('returns 401 when no token is provided', async () => {
    const app = createJwtTestApp();
    const res = await app.request('/api/protected');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 for invalid token', async () => {
    const app = createJwtTestApp();
    const res = await app.request('/api/protected', {
      headers: { Authorization: 'Bearer invalid-token' },
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 for token signed with wrong secret', async () => {
    const token = await sign(
      { sub: 'user-id', exp: Math.floor(Date.now() / 1000) + 3600 },
      'wrong-secret-that-is-also-long-enough',
    );
    const app = createJwtTestApp();
    const res = await app.request('/api/protected', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(401);
  });

  it('allows access with valid token', async () => {
    const token = await sign(
      { sub: 'user-auth-id', exp: Math.floor(Date.now() / 1000) + 3600 },
      JWT_SECRET,
    );
    const app = createJwtTestApp();
    const res = await app.request('/api/protected', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.userId).toBe('user-123');
  });

  it('skips auth for login endpoint', async () => {
    const app = createJwtTestApp();
    const res = await app.request('/api/auth/login', { method: 'POST' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.public).toBe(true);
  });

  it('returns 401 for expired token', async () => {
    const token = await sign(
      { sub: 'user-auth-id', exp: Math.floor(Date.now() / 1000) - 3600 },
      JWT_SECRET,
    );
    const app = createJwtTestApp();
    const res = await app.request('/api/protected', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(401);
  });
});
