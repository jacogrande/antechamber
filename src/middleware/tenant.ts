import { createMiddleware } from 'hono/factory';
import { and, eq } from 'drizzle-orm';
import type { AppEnv } from '../types/app';
import { getDb } from '../db/client';
import { tenantMemberships } from '../db/schema';
import { ValidationError, ForbiddenError } from '../lib/errors';

export const tenantMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const tenantId = c.req.header('X-Tenant-ID');

  if (!tenantId) {
    throw new ValidationError('X-Tenant-ID header is required');
  }

  const user = c.get('user');
  const db = getDb();

  const [membership] = await db
    .select()
    .from(tenantMemberships)
    .where(and(eq(tenantMemberships.tenantId, tenantId), eq(tenantMemberships.userId, user.id)))
    .limit(1);

  if (!membership) {
    throw new ForbiddenError('Not a member of this tenant');
  }

  c.set('tenantId', tenantId);
  c.set('tenantRole', membership.role);
  await next();
});
