import { createMiddleware } from 'hono/factory';
import { createRemoteJWKSet, jwtVerify, decodeProtectedHeader } from 'jose';
import { eq } from 'drizzle-orm';
import type { AppEnv } from '../index';
import { getEnv } from '../env';
import { getDb } from '../db/client';
import { users } from '../db/schema';
import { UnauthorizedError } from '../lib/errors';

// Cache the JWKS client
let jwksClient: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwksClient(supabaseUrl: string) {
  if (!jwksClient) {
    const jwksUrl = new URL('/auth/v1/.well-known/jwks.json', supabaseUrl);
    jwksClient = createRemoteJWKSet(jwksUrl);
  }
  return jwksClient;
}

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const env = getEnv();

  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid Authorization header');
  }

  const token = authHeader.slice(7);

  try {
    // Check which algorithm the token uses
    const header = decodeProtectedHeader(token);

    let payload: Record<string, unknown>;

    if (header.alg === 'ES256') {
      // Use JWKS for ES256 (asymmetric) tokens
      const jwks = getJwksClient(env.SUPABASE_URL);
      const result = await jwtVerify(token, jwks, {
        audience: 'authenticated',
      });
      payload = result.payload as Record<string, unknown>;
    } else {
      // Fall back to HS256 (symmetric) for older tokens
      const secret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);
      const result = await jwtVerify(token, secret, {
        algorithms: ['HS256'],
      });
      payload = result.payload as Record<string, unknown>;
    }

    c.set('jwtPayload', payload);

    const authId = payload.sub as string | undefined;
    if (!authId) {
      throw new UnauthorizedError('Token missing subject');
    }

    // Look up user by Supabase auth ID
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.authId, authId)).limit(1);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    c.set('user', { id: user.id, email: user.email });
    await next();
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    console.error('[AUTH] Token verification failed:', err);
    throw new UnauthorizedError('Invalid or expired token');
  }
});
