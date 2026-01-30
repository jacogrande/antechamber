import { Hono } from 'hono';
import { eq, and, max, desc, count } from 'drizzle-orm';
import { z } from 'zod';
import type { AppEnv } from '../types/app';
import { getDb } from '../db/client';
import { submissions, schemas, schemaVersions, workflowRuns, webhooks } from '../db/schema';
import { createSubmissionRequestSchema, confirmSubmissionRequestSchema } from '../types/api';
import { ValidationError, NotFoundError } from '../lib/errors';
import {
  parseExtractedFields,
  parseEditHistory,
  parseFieldDefinitions,
  parseStepRecords,
  type ExtractedFieldForExport,
  type EditHistoryEntry,
} from '../lib/validation';
import { WorkflowRunner } from '../lib/workflow/runner';
import { generateOnboardingDraft, STEP_NAMES } from '../lib/workflow/steps';
import type { WorkflowDeps } from '../lib/workflow/types';
import { AuditService } from '../lib/audit';
import { WebhookDeliveryService } from '../lib/webhooks';
import type { WebhookPayload } from '../lib/webhooks';
import { generateCsv } from '../lib/export/csv';
import { generateContextPack } from '../lib/export/context-pack';
import { getWorkflowDeps } from '../app-deps';

// ---------------------------------------------------------------------------
// Route dependencies - extends workflow deps with route-specific services
// ---------------------------------------------------------------------------

export interface SubmissionsRouteDeps extends Partial<WorkflowDeps> {
  auditService?: AuditService;
  webhookService?: WebhookDeliveryService;
}

// ---------------------------------------------------------------------------
// Factory: creates the submissions route with injected dependencies.
// In production, pass real deps. In tests, pass stubs.
// ---------------------------------------------------------------------------

export function createSubmissionsRoute(depsOverride?: SubmissionsRouteDeps) {
  // Create services once per route instance (not per request)
  let _auditService: AuditService | undefined;
  let _webhookService: WebhookDeliveryService | undefined;

  const getAuditService = (db: ReturnType<typeof getDb>): AuditService => {
    if (depsOverride?.auditService) return depsOverride.auditService;
    if (!_auditService) _auditService = new AuditService(db);
    return _auditService;
  };

  const getWebhookService = (db: ReturnType<typeof getDb>): WebhookDeliveryService => {
    if (depsOverride?.webhookService) return depsOverride.webhookService;
    if (!_webhookService) _webhookService = new WebhookDeliveryService(db, fetch);
    return _webhookService;
  };
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

    // Audit log submission creation
    const userId = c.get('user')?.id;
    const audit = getAuditService(db);
    await audit.logSubmissionCreated(tenantId, submission.id, userId, {
      schemaId: parsed.data.schemaId,
      schemaVersion: resolvedVersion,
      websiteUrl: parsed.data.websiteUrl,
    });

    // Build workflow deps from overrides or defaults
    const storage = depsOverride?.storage;
    const llmClient = depsOverride?.llmClient;

    // Only launch workflow if we have all required deps
    // In production, these should be wired via depsOverride at app startup
    console.log('[workflow] Checking deps:', { hasStorage: !!storage, hasLlmClient: !!llmClient });
    if (storage && llmClient) {
      const deps: WorkflowDeps = {
        db: depsOverride?.db ?? getDb(),
        storage,
        llmClient,
        fetchFn: depsOverride?.fetchFn,
      };
      const runner = new WorkflowRunner(deps);
      console.log(`[workflow] Starting workflow for submission ${submission.id}`);
      runner
        .execute(generateOnboardingDraft, submission.id, workflowRun.id)
        .catch(async (err) => {
          console.error(
            `[workflow] Failed for submission ${submission.id}:`,
            err,
          );
          // Update submission status to reflect workflow failure
          try {
            await db
              .update(submissions)
              .set({ status: 'failed', updatedAt: new Date() })
              .where(eq(submissions.id, submission.id));
          } catch (updateErr) {
            console.error(
              `[workflow] Failed to update submission ${submission.id} status:`,
              updateErr,
            );
          }
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

  // GET /api/submissions - List submissions for tenant
  route.get('/api/submissions', async (c) => {
    const tenantId = c.get('tenantId');
    const db = depsOverride?.db ?? getDb();

    // Optional query params for filtering
    const statusFilter = c.req.query('status');
    const limit = Math.min(Number(c.req.query('limit')) || 20, 100);
    const offset = Number(c.req.query('offset')) || 0;

    // Build query conditions
    const conditions = [eq(submissions.tenantId, tenantId)];
    if (statusFilter && ['pending', 'draft', 'confirmed', 'failed'].includes(statusFilter)) {
      conditions.push(eq(submissions.status, statusFilter as 'pending' | 'draft' | 'confirmed' | 'failed'));
    }

    // Get submissions with schema name joined
    const results = await db
      .select({
        id: submissions.id,
        schemaId: submissions.schemaId,
        schemaName: schemas.name,
        websiteUrl: submissions.websiteUrl,
        status: submissions.status,
        createdAt: submissions.createdAt,
        updatedAt: submissions.updatedAt,
      })
      .from(submissions)
      .leftJoin(schemas, eq(submissions.schemaId, schemas.id))
      .where(and(...conditions))
      .orderBy(desc(submissions.createdAt))
      .limit(limit + 1) // Fetch one extra to determine hasMore
      .offset(offset);

    const hasMore = results.length > limit;
    const submissionList = hasMore ? results.slice(0, limit) : results;

    // Get total count for the filter
    const [{ total }] = await db
      .select({ total: count() })
      .from(submissions)
      .where(and(...conditions));

    return c.json({
      submissions: submissionList,
      total,
      hasMore,
    });
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

    // Load schema for name
    const [schema] = await db
      .select({ name: schemas.name })
      .from(schemas)
      .where(eq(schemas.id, submission.schemaId));

    // Load schema version for field definitions (to get labels)
    const [schemaVersion] = await db
      .select({ fields: schemaVersions.fields })
      .from(schemaVersions)
      .where(
        and(
          eq(schemaVersions.schemaId, submission.schemaId),
          eq(schemaVersions.version, submission.schemaVersion),
        ),
      );

    const fieldDefs = schemaVersion ? parseFieldDefinitions(schemaVersion.fields) : [];
    const fieldDefMap = new Map(fieldDefs.map((f) => [f.key, f]));

    // Load latest workflow run
    const [latestRun] = await db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.submissionId, submissionId))
      .orderBy(desc(workflowRuns.createdAt))
      .limit(1);

    // Parse step records to get workflow steps and crawl output
    const stepRecords = latestRun ? parseStepRecords(latestRun.steps) : [];
    const workflowSteps = stepRecords.map((s) => ({
      name: s.name,
      status: s.status,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      error: s.error,
    }));

    // Extract artifacts from crawl step output
    const crawlStep = stepRecords.find((s) => s.name === 'crawl');
    const crawlOutput = crawlStep?.output as {
      extractedContent?: Array<{
        url: string;
        title: string;
        fetchedAt: string;
      }>;
    } | undefined;

    const artifacts = (crawlOutput?.extractedContent ?? []).map((page) => ({
      url: page.url,
      pageType: 'crawled', // We don't track page type currently
      fetchedAt: page.fetchedAt,
      statusCode: 200, // Successfully fetched pages are 200
    }));

    // Transform fields to frontend format
    console.log(`[submission-detail] Raw fields from DB:`, JSON.stringify(submission.fields));
    const rawFields = parseExtractedFields(submission.fields);
    console.log(`[submission-detail] Parsed fields:`, rawFields.length);
    const extractedFields = rawFields.map((f) => {
      const def = fieldDefMap.get(f.key);
      const confidence = f.confidence ?? 0;
      const citations = f.citations ?? [];

      // Map backend status to frontend status
      let frontendStatus: 'found' | 'not_found' | 'unknown' = 'unknown';
      if (f.value !== null && f.value !== undefined && confidence > 0) {
        frontendStatus = 'found';
      } else if (f.status === 'unknown' || confidence === 0) {
        frontendStatus = f.value === null ? 'not_found' : 'unknown';
      }

      return {
        fieldKey: f.key,
        fieldLabel: def?.label ?? f.key,
        fieldType: def?.type,
        value: f.value,
        status: frontendStatus,
        confidence,
        reason: f.reason,
        citations: citations.map((c) => ({
          sourceUrl: c.url,
          snippetText: c.snippet,
          confidence: confidence,
        })),
      };
    });

    return c.json({
      submission: {
        id: submission.id,
        schemaId: submission.schemaId,
        schemaName: schema?.name ?? null,
        schemaVersion: submission.schemaVersion,
        websiteUrl: submission.websiteUrl,
        status: submission.status,
        workflowRunId: latestRun?.id ?? null,
        workflowSteps,
        extractedFields,
        artifacts,
        customerMeta: submission.customerMeta,
        confirmedBy: submission.confirmedBy,
        confirmedAt: submission.confirmedAt?.toISOString(),
        createdAt: submission.createdAt.toISOString(),
        updatedAt: submission.updatedAt.toISOString(),
      },
    });
  });

  // POST /api/submissions/:submissionId/confirm
  route.post('/api/submissions/:submissionId/confirm', async (c) => {
    const submissionId = c.req.param('submissionId');

    // Validate UUID format
    const uuidResult = z.string().uuid().safeParse(submissionId);
    if (!uuidResult.success) {
      throw new ValidationError('Invalid submission ID format');
    }

    const body = await c.req.json();
    const parsed = confirmSubmissionRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.flatten());
    }

    const tenantId = c.get('tenantId');
    const userId = c.get('user')?.id;
    const db = depsOverride?.db ?? getDb();

    // Load submission
    const [submission] = await db
      .select()
      .from(submissions)
      .where(and(eq(submissions.id, submissionId), eq(submissions.tenantId, tenantId)));

    if (!submission) {
      throw new NotFoundError('Submission not found');
    }

    // Must be in draft status to confirm
    if (submission.status !== 'draft') {
      throw new ValidationError('Submission must be in draft status to confirm');
    }

    const audit = getAuditService(db);
    const fields: ExtractedFieldForExport[] = parseExtractedFields(submission.fields);

    // Track edit history
    const editHistory: EditHistoryEntry[] = parseEditHistory(submission.editHistory);
    const now = new Date().toISOString();

    // Apply edits if provided
    if (parsed.data.edits && parsed.data.edits.length > 0) {
      // Load schema version for validation
      const [version] = await db
        .select()
        .from(schemaVersions)
        .where(
          and(
            eq(schemaVersions.schemaId, submission.schemaId),
            eq(schemaVersions.version, submission.schemaVersion),
          ),
        );

      const fieldDefs = parseFieldDefinitions(version?.fields);
      const fieldDefMap = new Map(fieldDefs.map((f) => [f.key, f]));

      for (const edit of parsed.data.edits) {
        // Validate field exists in schema
        const fieldDef = fieldDefMap.get(edit.fieldKey);
        if (!fieldDef) {
          throw new ValidationError(`Unknown field key: ${edit.fieldKey}`);
        }

        // Find or create field
        const fieldIndex = fields.findIndex((f) => f.key === edit.fieldKey);
        const oldValue = fieldIndex >= 0 ? fields[fieldIndex].value : undefined;

        if (fieldIndex >= 0) {
          fields[fieldIndex].value = edit.value;
          fields[fieldIndex].status = 'user_edited';
        } else {
          fields.push({
            key: edit.fieldKey,
            value: edit.value,
            status: 'user_edited',
          });
        }

        // Record edit history
        editHistory.push({
          fieldKey: edit.fieldKey,
          oldValue,
          newValue: edit.value,
          editedAt: now,
          editedBy: userId ?? 'unknown',
        });

        // Audit log
        await audit.logFieldEdited(
          tenantId,
          submissionId,
          userId,
          edit.fieldKey,
          oldValue,
          edit.value,
        );
      }
    }

    // Update submission to confirmed
    const confirmedAt = new Date();
    await db
      .update(submissions)
      .set({
        status: 'confirmed',
        confirmedBy: parsed.data.confirmedBy,
        confirmedAt,
        fields,
        editHistory,
        updatedAt: confirmedAt,
      })
      .where(eq(submissions.id, submissionId));

    // Audit log confirmation
    await audit.logSubmissionConfirmed(
      tenantId,
      submissionId,
      userId,
      parsed.data.confirmedBy,
    );

    // Queue webhook deliveries
    const activeWebhooks = await db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.tenantId, tenantId), eq(webhooks.isActive, true)));

    const webhookService = getWebhookService(db);
    let webhooksQueued = 0;

    // Build webhook payload
    const webhookPayload: WebhookPayload = {
      event: 'submission.confirmed',
      submissionId,
      tenantId,
      submission: {
        id: submissionId,
        schemaId: submission.schemaId,
        schemaVersion: submission.schemaVersion,
        websiteUrl: submission.websiteUrl,
        status: 'confirmed',
        fields,
        confirmedAt: confirmedAt.toISOString(),
        confirmedBy: parsed.data.confirmedBy,
      },
      artifacts: {
        crawledPages: [],
        htmlSnapshotKeys: [],
      },
    };

    // Load artifacts from workflow
    const [latestRun] = await db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.submissionId, submissionId))
      .orderBy(desc(workflowRuns.createdAt))
      .limit(1);

    if (latestRun) {
      const steps = parseStepRecords(latestRun.steps);
      const crawlStep = steps.find((s) => s.name === STEP_NAMES.CRAWL);
      if (crawlStep?.output) {
        const output = crawlStep.output as {
          pages?: Array<{ url: string }>;
          artifactKeys?: string[];
        };
        webhookPayload.artifacts.crawledPages = output.pages?.map((p) => p.url) ?? [];
        webhookPayload.artifacts.htmlSnapshotKeys = output.artifactKeys ?? [];
      }
    }

    // Queue for webhooks that have submission.confirmed event
    for (const webhook of activeWebhooks) {
      if (webhook.events?.includes('submission.confirmed')) {
        await webhookService.queueDelivery(
          webhook.id,
          submissionId,
          'submission.confirmed',
          webhookPayload,
        );
        webhooksQueued++;
      }
    }

    return c.json({
      submission: {
        id: submissionId,
        status: 'confirmed',
        confirmedAt: confirmedAt.toISOString(),
        confirmedBy: parsed.data.confirmedBy,
        fields,
        editHistory,
      },
      webhooksQueued,
    });
  });

  // GET /api/submissions/:submissionId/artifacts
  route.get('/api/submissions/:submissionId/artifacts', async (c) => {
    const submissionId = c.req.param('submissionId');

    // Validate UUID format
    const uuidResult = z.string().uuid().safeParse(submissionId);
    if (!uuidResult.success) {
      throw new ValidationError('Invalid submission ID format');
    }

    const tenantId = c.get('tenantId');
    const db = depsOverride?.db ?? getDb();
    const storage = depsOverride?.storage;

    // Load submission
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

    if (!latestRun || latestRun.status !== 'completed') {
      throw new ValidationError('Workflow has not completed');
    }

    // Extract artifact keys from crawl step
    const steps = parseStepRecords(latestRun.steps);
    const crawlStep = steps.find((s) => s.name === STEP_NAMES.CRAWL);
    const output = crawlStep?.output as {
      pages?: Array<{ url: string }>;
      artifactKeys?: string[];
    } | undefined;

    const artifactKeys = output?.artifactKeys ?? [];
    const pages = output?.pages ?? [];

    // Generate signed URLs
    const artifacts = await Promise.all(
      artifactKeys.map(async (key, index) => {
        const expiresInSec = 3600; // 1 hour
        const signedUrl = storage
          ? await storage.getSignedUrl(key, expiresInSec)
          : `https://storage.local/${key}`;
        const expiresAt = new Date(Date.now() + expiresInSec * 1000);

        return {
          url: pages[index]?.url ?? key,
          type: key.endsWith('.html') ? 'raw_html' : 'extracted_text',
          signedUrl,
          expiresAt: expiresAt.toISOString(),
        };
      }),
    );

    return c.json({ artifacts });
  });

  // GET /api/submissions/:submissionId/export/csv
  route.get('/api/submissions/:submissionId/export/csv', async (c) => {
    const submissionId = c.req.param('submissionId');

    // Validate UUID format
    const uuidResult = z.string().uuid().safeParse(submissionId);
    if (!uuidResult.success) {
      throw new ValidationError('Invalid submission ID format');
    }

    const tenantId = c.get('tenantId');
    const db = depsOverride?.db ?? getDb();

    // Load submission
    const [submission] = await db
      .select()
      .from(submissions)
      .where(and(eq(submissions.id, submissionId), eq(submissions.tenantId, tenantId)));

    if (!submission) {
      throw new NotFoundError('Submission not found');
    }

    if (submission.status !== 'confirmed') {
      throw new ValidationError('Submission must be confirmed to export');
    }

    // Load schema version
    const [version] = await db
      .select()
      .from(schemaVersions)
      .where(
        and(
          eq(schemaVersions.schemaId, submission.schemaId),
          eq(schemaVersions.version, submission.schemaVersion),
        ),
      );

    const fieldDefs = parseFieldDefinitions(version?.fields);
    const fields = parseExtractedFields(submission.fields);

    const csv = generateCsv(
      {
        id: submission.id,
        websiteUrl: submission.websiteUrl,
        fields,
        confirmedAt: submission.confirmedAt?.toISOString() ?? new Date().toISOString(),
        confirmedBy: submission.confirmedBy ?? 'unknown',
      },
      fieldDefs,
    );

    return c.body(csv, 200, {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="submission-${submissionId}.csv"`,
    });
  });

  // GET /api/submissions/:submissionId/context-pack
  route.get('/api/submissions/:submissionId/context-pack', async (c) => {
    const submissionId = c.req.param('submissionId');

    // Validate UUID format
    const uuidResult = z.string().uuid().safeParse(submissionId);
    if (!uuidResult.success) {
      throw new ValidationError('Invalid submission ID format');
    }

    const tenantId = c.get('tenantId');
    const db = depsOverride?.db ?? getDb();

    // Load submission
    const [submission] = await db
      .select()
      .from(submissions)
      .where(and(eq(submissions.id, submissionId), eq(submissions.tenantId, tenantId)));

    if (!submission) {
      throw new NotFoundError('Submission not found');
    }

    if (submission.status !== 'confirmed') {
      throw new ValidationError('Submission must be confirmed to get context pack');
    }

    // Load artifacts from workflow
    const [latestRun] = await db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.submissionId, submissionId))
      .orderBy(desc(workflowRuns.createdAt))
      .limit(1);

    const steps = parseStepRecords(latestRun?.steps);
    const crawlStep = steps.find((s) => s.name === STEP_NAMES.CRAWL);
    const output = crawlStep?.output as {
      pages?: Array<{ url: string; title?: string; fetchedAt?: string }>;
    } | undefined;

    const artifacts = (output?.pages ?? []).map((p) => ({
      url: p.url,
      title: p.title,
      retrievedAt: p.fetchedAt ?? new Date().toISOString(),
    }));

    const fields = parseExtractedFields(submission.fields);

    const contextPack = generateContextPack(
      {
        id: submission.id,
        schemaId: submission.schemaId,
        schemaVersion: submission.schemaVersion,
        websiteUrl: submission.websiteUrl,
        fields,
        confirmedAt: submission.confirmedAt?.toISOString() ?? new Date().toISOString(),
      },
      artifacts,
    );

    return c.json(contextPack);
  });

  return route;
}

const submissionsRoute = createSubmissionsRoute(getWorkflowDeps() ?? undefined);
export default submissionsRoute;
