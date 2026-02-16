import { Hono } from 'hono';
import { eq, count, and, sql } from 'drizzle-orm';
import type { AppEnv } from '../types/app';
import { getDb } from '../db/client';
import { schemas, submissions, webhooks, tenants, workflowRuns } from '../db/schema';
import { estimateCostUsd } from '../lib/extraction/cost';

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
    [llmUsageResult],
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
    db.execute<{ total_input: string; total_output: string }>(sql`
      SELECT
        COALESCE(SUM(
          CASE WHEN jsonb_typeof(step->'output'->'usage'->'inputTokens') = 'number'
            THEN (step->'output'->'usage'->>'inputTokens')::int
            ELSE 0 END
        ), 0) AS total_input,
        COALESCE(SUM(
          CASE WHEN jsonb_typeof(step->'output'->'usage'->'outputTokens') = 'number'
            THEN (step->'output'->'usage'->>'outputTokens')::int
            ELSE 0 END
        ), 0) AS total_output
      FROM ${workflowRuns} wr
      INNER JOIN ${submissions} s ON wr.submission_id = s.id
      CROSS JOIN LATERAL jsonb_array_elements(wr.steps) AS step
      WHERE s.tenant_id = ${tenantId}
        AND step->>'name' = 'extract'
        AND step->>'status' = 'completed'
    `),
  ]);

  const totalInputTokens = Number(llmUsageResult?.total_input ?? 0);
  const totalOutputTokens = Number(llmUsageResult?.total_output ?? 0);

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
    llmUsage: {
      totalInputTokens,
      totalOutputTokens,
      estimatedCostUsd: estimateCostUsd({ inputTokens: totalInputTokens, outputTokens: totalOutputTokens }),
    },
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
