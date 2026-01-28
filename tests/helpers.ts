import { sign } from 'hono/utils/jwt/jwt';
import app from '../src/index';
import { TEST_USER, TEST_TENANT } from '../src/db/seed';

const TEST_JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long';

/**
 * Create a signed JWT for testing.
 * The `sub` claim maps to the user's authId (Supabase auth user id).
 */
export async function createTestToken(
  overrides: { sub?: string; email?: string } = {},
): Promise<string> {
  const payload = {
    sub: overrides.sub ?? TEST_USER.authId,
    email: overrides.email ?? TEST_USER.email,
    aud: 'authenticated',
    role: 'authenticated',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  return sign(payload, TEST_JWT_SECRET);
}

export function authHeaders(token: string, tenantId?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (tenantId) {
    headers['X-Tenant-ID'] = tenantId;
  }
  return headers;
}

/**
 * Make a request to the Hono app for testing.
 */
export function testRequest(
  path: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  } = {},
) {
  const { method = 'GET', headers = {}, body } = options;

  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    init.body = JSON.stringify(body);
  }

  return app.request(path, init);
}

export { TEST_USER, TEST_TENANT, TEST_JWT_SECRET };
