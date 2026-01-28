import { Hono } from 'hono';
import { eq, and, max, desc } from 'drizzle-orm';
import { z } from 'zod';
import type { AppEnv } from '../index';
import { getDb } from '../db/client';
import { submissions, schemas, schemaVersions, workflowRuns } from '../db/schema';
import { createSubmissionRequestSchema } from '../types/api';
import { ValidationError, NotFoundError } from '../lib/errors';
import { WorkflowRunner } from '../lib/workflow/runner';
import { generateOnboardingDraft } from '../lib/workflow/steps';
import type { WorkflowDeps } from '../lib/workflow/types';
import type { StepRecord } from '../lib/workflow/types';

// ---------------------------------------------------------------------------
// Factory: creates the submissions route with injected dependencies.
// In production, pass real deps. In tests, pass stubs.
// ---------------------------------------------------------------------------

export function createSubmissionsRoute(depsOverride?: Partial<WorkflowDeps>) {
  const route = new Hono<AppEnv>();

  route.post('/api/submissions', async (c) => {
    const body = await c.req.json();
    const parsed = createSubmissionRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.flatten());
    }

    const tenantId = c.get('tenantId');
    const db = depsOverride?.db ?? getDb();

    // Verify schema exists and belongs to tenant
    const [schema] = await db
      .select()
      .from(schemas)
      .where(and(eq(schemas.id, parsed.data.schemaId), eq(schemas.tenantId, tenantId)));

    if (!schema) {
      throw new NotFoundError('Schema not found');
    }

    // Resolve schema version (latest if omitted)
    let resolvedVersion: number;
    if (parsed.data.schemaVersion !== undefined) {
      const [version] = await db
        .select()
        .from(schemaVersions)
        .where(
          and(
            eq(schemaVersions.schemaId, parsed.data.schemaId),
            eq(schemaVersions.version, parsed.data.schemaVersion),
          ),
        );
      if (!version) {
        throw new NotFoundError('Schema version not found');
      }
      resolvedVersion = version.version;
    } else {
      const [result] = await db
        .select({ maxVersion: max(schemaVersions.version) })
        .from(schemaVersions)
        .where(eq(schemaVersions.schemaId, parsed.data.schemaId));
      if (!result?.maxVersion) {
        throw new NotFoundError('No versions found for schema');
      }
      resolvedVersion = result.maxVersion;
    }

    // Create submission and workflow run atomically
    const { submission, workflowRun } = await db.transaction(async (tx) => {
      const [sub] = await tx
        .insert(submissions)
        .values({
          tenantId,
          schemaId: parsed.data.schemaId,
          schemaVersion: resolvedVersion,
          websiteUrl: parsed.data.websiteUrl,
          status: 'pending',
          customerMeta: parsed.data.customerMeta ?? null,
        })
        .returning();

      const [run] = await tx
        .insert(workflowRuns)
        .values({
          submissionId: sub.id,
          workflowName: generateOnboardingDraft.name,
          status: 'pending',
          steps: [],
        })
        .returning();

      return { submission: sub, workflowRun: run };
    });

    // Build workflow deps from overrides or defaults
    const storage = depsOverride?.storage;
    const llmClient = depsOverride?.llmClient;

    // Only launch workflow if we have all required deps
    // In production, these should be wired via depsOverride at app startup
    if (storage && llmClient) {
      const deps: WorkflowDeps = {
        db: depsOverride?.db ?? getDb(),
        storage,
        llmClient,
        fetchFn: depsOverride?.fetchFn,
      };
      const runner = new WorkflowRunner(deps);
      runner
        .execute(generateOnboardingDraft, submission.id, workflowRun.id)
        .catch((err) => {
          console.error(
            `[workflow] Failed for submission ${submission.id}:`,
            err,
          );
        });
    } else {
      // Missing deps — log warning but don't crash
      // The workflow run stays in 'pending' status and can be retried later
      console.warn(
        `[workflow] Skipping auto-launch for submission ${submission.id}: ` +
          'storage or llmClient not configured. ' +
          'Workflow run created with status=pending for manual/retry trigger.',
      );
    }

    return c.json(
      {
        submissionId: submission.id,
        workflowRunId: workflowRun.id,
      },
      202,
    );
  });

  route.get('/api/submissions/:submissionId', async (c) => {
    const submissionId = c.req.param('submissionId');

    // Validate UUID format
    const uuidResult = z.string().uuid().safeParse(submissionId);
    if (!uuidResult.success) {
      throw new ValidationError('Invalid submission ID format');
    }

    const tenantId = c.get('tenantId');
    const db = depsOverride?.db ?? getDb();

    const [submission] = await db
      .select()
      .from(submissions)
      .where(and(eq(submissions.id, submissionId), eq(submissions.tenantId, tenantId)));

    if (!submission) {
      throw new NotFoundError('Submission not found');
    }

    // Load latest workflow run
    const [latestRun] = await db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.submissionId, submissionId))
      .orderBy(desc(workflowRuns.createdAt))
      .limit(1);

    // Strip step outputs from response (internal/idempotency only)
    const sanitizedSteps = latestRun
      ? ((latestRun.steps as StepRecord[]) ?? []).map((s) => ({
          name: s.name,
          status: s.status,
          startedAt: s.startedAt,
          completedAt: s.completedAt,
          error: s.error,
          attempts: s.attempts,
        }))
      : [];

    return c.json({
      submission: {
        id: submission.id,
        tenantId: submission.tenantId,
        schemaId: submission.schemaId,
        schemaVersion: submission.schemaVersion,
        websiteUrl: submission.websiteUrl,
        status: submission.status,
        fields: submission.fields,
        customerMeta: submission.customerMeta,
        confirmedBy: submission.confirmedBy,
        confirmedAt: submission.confirmedAt,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
      },
      workflow: latestRun
        ? {
            id: latestRun.id,
            status: latestRun.status,
            steps: sanitizedSteps,
            error: latestRun.error,
            startedAt: latestRun.startedAt,
            completedAt: latestRun.completedAt,
          }
        : null,
    });
  });

  return route;
}

const submissionsRoute = createSubmissionsRoute();
export default submissionsRoute;
