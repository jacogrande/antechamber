import { createMiddleware } from 'hono/factory';
import { jwt } from 'hono/jwt';
import { eq } from 'drizzle-orm';
import type { AppEnv } from '../index';
import { getEnv } from '../env';
import { getDb } from '../db/client';
import { users } from '../db/schema';
import { UnauthorizedError } from '../lib/errors';

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const env = getEnv();

  // Use Hono's jwt middleware to verify token
  const jwtMiddleware = jwt({ secret: env.SUPABASE_JWT_SECRET, alg: 'HS256' });
  try {
    await jwtMiddleware(c, async () => {});
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }

  const payload = c.get('jwtPayload');
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
});
