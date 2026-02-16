import { Hono } from 'hono';
import { eq, and, desc, count } from 'drizzle-orm';
import type { AppEnv } from '../types/app';
import { getDb } from '../db/client';
import { auditLogs } from '../db/schema';
import type { AuditEventType, AuditResourceType } from '../lib/audit/types';

const auditRoute = new Hono<AppEnv>();

// GET /api/audit-logs - List audit logs for tenant
auditRoute.get('/api/audit-logs', async (c) => {
  const tenantId = c.get('tenantId');
  const db = getDb();

  const limit = Math.min(Number(c.req.query('limit')) || 50, 100);
  const offset = Number(c.req.query('offset')) || 0;
  const eventFilter = c.req.query('event') as AuditEventType | undefined;
  const resourceTypeFilter = c.req.query('resourceType') as AuditResourceType | undefined;

  // Build query conditions
  const conditions = [eq(auditLogs.tenantId, tenantId)];
  if (eventFilter) {
    conditions.push(eq(auditLogs.event, eventFilter));
  }
  if (resourceTypeFilter) {
    conditions.push(eq(auditLogs.resourceType, resourceTypeFilter));
  }

  // Run both queries in parallel
  const [results, [{ total }]] = await Promise.all([
    db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit + 1)
      .offset(offset),
    db
      .select({ total: count() })
      .from(auditLogs)
      .where(and(...conditions)),
  ]);

  const hasMore = results.length > limit;
  const logs = hasMore ? results.slice(0, limit) : results;

  return c.json({
    auditLogs: logs.map((log) => ({
      id: log.id,
      event: log.event,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      userId: log.userId,
      details: log.details,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt.toISOString(),
    })),
    total,
    hasMore,
  });
});

export default auditRoute;
