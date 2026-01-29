import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../index';
import { ForbiddenError } from '../lib/errors';

type TenantRole = 'admin' | 'editor' | 'viewer';

const roleHierarchy: Record<TenantRole, number> = {
  admin: 3,
  editor: 2,
  viewer: 1,
};

/**
 * Middleware factory that enforces minimum role requirements.
 * Must be used after tenantMiddleware (which sets tenantRole).
 */
export function requireRole(minimumRole: TenantRole) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const userRole = c.get('tenantRole');

    if (!userRole) {
      throw new ForbiddenError('No tenant role assigned');
    }

    if (roleHierarchy[userRole] < roleHierarchy[minimumRole]) {
      throw new ForbiddenError(`Requires ${minimumRole} role`);
    }

    await next();
  });
}
