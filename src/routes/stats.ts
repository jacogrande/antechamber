import { Hono } from 'hono';
import { eq, count, and } from 'drizzle-orm';
import type { AppEnv } from '../index';
import { getDb } from '../db/client';
import { schemas, submissions, webhooks, tenants } from '../db/schema';

const statsRoute = new Hono<AppEnv>();

// GET /api/stats - Dashboard statistics for tenant
statsRoute.get('/api/stats', async (c) => {
  const tenantId = c.get('tenantId');
  const db = getDb();

  // Run all count queries in parallel
  const [
    [schemasResult],
    [submissionsTotal],
    [submissionsPending],
    [submissionsDraft],
    [submissionsConfirmed],
    [submissionsFailed],
    [webhooksActive],
  ] = await Promise.all([
    db.select({ total: count() }).from(schemas).where(eq(schemas.tenantId, tenantId)),
    db.select({ total: count() }).from(submissions).where(eq(submissions.tenantId, tenantId)),
    db
      .select({ total: count() })
      .from(submissions)
      .where(and(eq(submissions.tenantId, tenantId), eq(submissions.status, 'pending'))),
    db
      .select({ total: count() })
      .from(submissions)
      .where(and(eq(submissions.tenantId, tenantId), eq(submissions.status, 'draft'))),
    db
      .select({ total: count() })
      .from(submissions)
      .where(and(eq(submissions.tenantId, tenantId), eq(submissions.status, 'confirmed'))),
    db
      .select({ total: count() })
      .from(submissions)
      .where(and(eq(submissions.tenantId, tenantId), eq(submissions.status, 'failed'))),
    db
      .select({ total: count() })
      .from(webhooks)
      .where(and(eq(webhooks.tenantId, tenantId), eq(webhooks.isActive, true))),
  ]);

  return c.json({
    schemas: { total: schemasResult.total },
    submissions: {
      total: submissionsTotal.total,
      pending: submissionsPending.total,
      draft: submissionsDraft.total,
      confirmed: submissionsConfirmed.total,
      failed: submissionsFailed.total,
    },
    webhooks: { active: webhooksActive.total },
  });
});

// GET /api/tenant - Current tenant info
statsRoute.get('/api/tenant', async (c) => {
  const tenantId = c.get('tenantId');
  const db = getDb();

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);

  if (!tenant) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Tenant not found' } }, 404);
  }

  return c.json({
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      createdAt: tenant.createdAt.toISOString(),
    },
  });
});

export default statsRoute;
