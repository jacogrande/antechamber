import { createMiddleware } from 'hono/factory';
import { eq, and, isNull } from 'drizzle-orm';
import type { PublicEnv } from '../types/public';
import { getDb } from '../db/client';
import { publishableKeys } from '../db/schema';
import { hashPublishableKey } from '../lib/publishable-keys';
import { UnauthorizedError } from '../lib/errors';
import { createLogger } from '../lib/logger';

const log = createLogger('publishable-key');

export const publishableKeyMiddleware = createMiddleware<PublicEnv>(async (c, next) => {
  const rawKey = c.req.header('X-Publishable-Key');
  if (!rawKey) {
    throw new UnauthorizedError('Missing X-Publishable-Key header');
  }

  const keyHash = hashPublishableKey(rawKey);
  const db = getDb();

  const [key] = await db
    .select({ id: publishableKeys.id, tenantId: publishableKeys.tenantId })
    .from(publishableKeys)
    .where(and(eq(publishableKeys.keyHash, keyHash), isNull(publishableKeys.revokedAt)));

  if (!key) {
    throw new UnauthorizedError('Invalid or revoked publishable key');
  }

  c.set('tenantId', key.tenantId);

  // Fire-and-forget lastUsedAt update
  void db
    .update(publishableKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(publishableKeys.id, key.id))
    .execute()
    .catch((err: unknown) => log.warn('Failed to update lastUsedAt', { error: err instanceof Error ? err.message : String(err) }));

  await next();
});
