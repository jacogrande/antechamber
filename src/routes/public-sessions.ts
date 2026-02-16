import { Hono } from 'hono';
import { eq, and, max, desc } from 'drizzle-orm';
import { z } from 'zod';
import type { PublicEnv } from '../types/public';
import { getDb } from '../db/client';
import type { Database } from '../db/client';
import { submissions, schemas, schemaVersions, workflowRuns, webhooks } from '../db/schema';
import { ValidationError, NotFoundError, UnauthorizedError } from '../lib/errors';
import {
  parseExtractedFields,
  parseEditHistory,
  parseFieldDefinitions,
  parseStepRecords,
  type ExtractedFieldForExport,
  type EditHistoryEntry,
} from '../lib/validation';
import { signSessionToken, verifySessionToken } from '../lib/session-token';
import { WorkflowRunner } from '../lib/workflow/runner';
import { generateOnboardingDraft, STEP_NAMES } from '../lib/workflow/steps';
import type { WorkflowDeps } from '../lib/workflow/types';
import { AuditService } from '../lib/audit';
import { WebhookDeliveryService } from '../lib/webhooks';
import type { WebhookPayload } from '../lib/webhooks';
import { getWorkflowDeps } from '../app-deps';
import { createLogger } from '../lib/logger';
import { isEncrypted, decrypt } from '../lib/crypto';

const log = createLogger('public-sessions');

// ---------------------------------------------------------------------------
// Route dependencies
// ---------------------------------------------------------------------------

export interface PublicSessionsRouteDeps extends Partial<WorkflowDeps> {
  auditService?: AuditService;
  webhookService?: WebhookDeliveryService;
}

// ---------------------------------------------------------------------------
// Zod schemas for public API
// ---------------------------------------------------------------------------

const createSessionSchema = z.object({
  schemaId: z.string().uuid(),
  schemaVersion: z.coerce.number().int().positive().optional(),
  websiteUrl: z.string().url(),
  customer: z
    .object({
      email: z.string().email().optional(),
      name: z.string().optional(),
    })
    .optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

const confirmSessionSchema = z.object({
  edits: z
    .array(
      z.object({
        key: z.string(),
        value: z.unknown(),
      }),
    )
    .optional(),
});

// ---------------------------------------------------------------------------
// Allowed field status values for the client
// ---------------------------------------------------------------------------

const ALLOWED_STATUSES = ['auto', 'needs_review', 'unknown', 'user_edited'] as const;

// ---------------------------------------------------------------------------
// Progress mapping: workflow step name → client ProgressStage
// ---------------------------------------------------------------------------

const PROGRESS_MAP: Record<string, { stage: string; message: string }> = {
  [STEP_NAMES.VALIDATE]: { stage: 'validating', message: 'Validating your website...' },
  [STEP_NAMES.CRAWL]: { stage: 'crawling', message: 'Crawling your website...' },
  [STEP_NAMES.EXTRACT]: { stage: 'extracting', message: 'Extracting company information...' },
  [STEP_NAMES.PERSIST_DRAFT]: { stage: 'finalizing', message: 'Finalizing draft...' },
};

// ---------------------------------------------------------------------------
// Helper: extract + verify session token from Authorization header
// ---------------------------------------------------------------------------

async function extractSessionToken(authHeader: string | undefined) {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid Authorization header');
  }
  const token = authHeader.slice(7);
  return verifySessionToken(token);
}

// ---------------------------------------------------------------------------
// Helper: map DB fields → client response fields
// ---------------------------------------------------------------------------

function mapFieldsForClient(
  rawFields: ExtractedFieldForExport[],
  fieldDefMap: Map<string, { label: string; type: string }>,
) {
  return rawFields.map((f) => {
    const def = fieldDefMap.get(f.key);
    const confidence = f.confidence ?? 0;
    const citations = (f.citations ?? []).map((cit) => ({
      url: cit.url ?? '',
      snippet: cit.snippet ?? '',
      pageTitle: cit.pageTitle ?? cit.title ?? '',
      retrievedAt: cit.retrievedAt ?? '',
    }));

    let status: string = f.status ?? 'unknown';
    if (!ALLOWED_STATUSES.includes(status as (typeof ALLOWED_STATUSES)[number])) {
      status = 'unknown';
    }

    return {
      key: f.key,
      label: def?.label ?? f.key,
      type: def?.type,
      value: f.value,
      status,
      confidence,
      reason: f.reason,
      citations,
    };
  });
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createPublicSessionsRoute(depsOverride?: PublicSessionsRouteDeps) {
  let _auditService: AuditService | undefined;
  let _webhookService: WebhookDeliveryService | undefined;

  const getAuditService = (db: Database): AuditService => {
    if (depsOverride?.auditService) return depsOverride.auditService;
    if (!_auditService) _auditService = new AuditService(db);
    return _auditService;
  };

  const getWebhookService = (db: Database): WebhookDeliveryService => {
    if (depsOverride?.webhookService) return depsOverride.webhookService;
    if (!_webhookService) _webhookService = new WebhookDeliveryService(db, fetch);
    return _webhookService;
  };

  const route = new Hono<PublicEnv>();

  // -----------------------------------------------------------------------
  // POST /public/sessions — Create a new session
  // -----------------------------------------------------------------------
  route.post('/public/sessions', async (c) => {
    const body = await c.req.json();
    const parsed = createSessionSchema.safeParse(body);

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
          customerMeta: {
            customer: parsed.data.customer ?? null,
            metadata: parsed.data.metadata ?? null,
          },
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

    // Audit log
    const audit = getAuditService(db);
    await audit.logSubmissionCreated(tenantId, submission.id, undefined, {
      schemaId: parsed.data.schemaId,
      schemaVersion: resolvedVersion,
      websiteUrl: parsed.data.websiteUrl,
      source: 'public_api',
    });

    // Generate session token
    const sessionToken = await signSessionToken(submission.id, tenantId);

    // Launch workflow async (same pattern as submissions route)
    const storage = depsOverride?.storage;
    const llmClient = depsOverride?.llmClient;

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
        .catch(async (err) => {
          log.error('Workflow failed', { submissionId: submission.id, error: err instanceof Error ? err.message : String(err) });
          try {
            await db
              .update(submissions)
              .set({ status: 'failed', updatedAt: new Date() })
              .where(eq(submissions.id, submission.id));
          } catch (updateErr) {
            log.error('Failed to update submission status', { submissionId: submission.id, error: updateErr instanceof Error ? updateErr.message : String(updateErr) });
          }
        });
    } else {
      log.warn('Skipping workflow: deps not configured', { submissionId: submission.id });
    }

    return c.json(
      {
        sessionId: submission.id,
        sessionToken,
        config: {
          reviewMode: 'blocking',
          reviewUrl: '',
        },
      },
      201,
    );
  });

  // -----------------------------------------------------------------------
  // GET /public/sessions/:id — Poll session status
  // -----------------------------------------------------------------------
  route.get('/public/sessions/:id', async (c) => {
    const sessionId = c.req.param('id');
    const tenantId = c.get('tenantId');

    // Verify session token
    const tokenData = await extractSessionToken(c.req.header('Authorization'));

    if (tokenData.submissionId !== sessionId) {
      throw new UnauthorizedError('Token does not match session');
    }
    if (tokenData.tenantId !== tenantId) {
      throw new UnauthorizedError('Token does not match tenant');
    }

    const db = depsOverride?.db ?? getDb();

    // Load submission
    const [submission] = await db
      .select()
      .from(submissions)
      .where(and(eq(submissions.id, sessionId), eq(submissions.tenantId, tenantId)));

    if (!submission) {
      throw new NotFoundError('Session not found');
    }

    // Load latest workflow run
    const [latestRun] = await db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.submissionId, sessionId))
      .orderBy(desc(workflowRuns.createdAt))
      .limit(1);

    const stepRecords = latestRun ? parseStepRecords(latestRun.steps) : [];

    // Build progress from workflow steps
    let progress: { stage: string; message: string; pagesFound?: number; pagesCrawled?: number } | undefined;

    if (submission.status === 'pending' && latestRun) {
      // Find the currently running or most recent step
      const runningStep = stepRecords.find((s) => s.status === 'running');
      const lastCompletedStep = [...stepRecords].reverse().find((s) => s.status === 'completed');
      const activeStep = runningStep ?? lastCompletedStep;

      if (activeStep) {
        const mapped = PROGRESS_MAP[activeStep.name];
        if (mapped) {
          progress = { stage: mapped.stage, message: mapped.message };

          // Extract page counts from crawl step output
          const crawlStep = stepRecords.find((s) => s.name === STEP_NAMES.CRAWL);
          if (crawlStep?.output) {
            const output = crawlStep.output as { pageCount?: number };
            if (output.pageCount !== undefined) {
              progress.pagesFound = output.pageCount;
              progress.pagesCrawled = crawlStep.status === 'completed' ? output.pageCount : undefined;
            }
          }
        }
      }
    }

    // Build draft from extracted fields
    let draft: { fields: Array<Record<string, unknown>> } | undefined;
    if (submission.status === 'draft' || submission.status === 'confirmed') {
      // Load schema version for field definitions
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

      const rawFields = parseExtractedFields(submission.fields);
      draft = { fields: mapFieldsForClient(rawFields, fieldDefMap) };
    }

    // Map submission status to client status
    let clientStatus: string = submission.status;
    if (submission.status === 'pending') {
      clientStatus = 'processing';
    }

    // Build error if failed
    let error: { message: string; code?: string } | undefined;
    if (submission.status === 'failed') {
      const failedStep = stepRecords.find((s) => s.status === 'failed');
      error = {
        message: failedStep?.error ?? 'An unexpected error occurred',
        code: 'WORKFLOW_FAILED',
      };
    }

    return c.json({
      sessionId,
      status: clientStatus,
      ...(progress && { progress }),
      ...(draft && { draft }),
      ...(error && { error }),
    });
  });

  // -----------------------------------------------------------------------
  // POST /public/sessions/:id/confirm — Confirm session with optional edits
  // -----------------------------------------------------------------------
  route.post('/public/sessions/:id/confirm', async (c) => {
    const sessionId = c.req.param('id');
    const tenantId = c.get('tenantId');

    // Verify session token
    const tokenData = await extractSessionToken(c.req.header('Authorization'));

    if (tokenData.submissionId !== sessionId) {
      throw new UnauthorizedError('Token does not match session');
    }
    if (tokenData.tenantId !== tenantId) {
      throw new UnauthorizedError('Token does not match tenant');
    }

    const body = await c.req.json();
    const parsed = confirmSessionSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.flatten());
    }

    const db = depsOverride?.db ?? getDb();

    // Load submission
    const [submission] = await db
      .select()
      .from(submissions)
      .where(and(eq(submissions.id, sessionId), eq(submissions.tenantId, tenantId)));

    if (!submission) {
      throw new NotFoundError('Session not found');
    }

    if (submission.status !== 'draft') {
      throw new ValidationError('Session must be in draft status to confirm');
    }

    const audit = getAuditService(db);
    const fields: ExtractedFieldForExport[] = parseExtractedFields(submission.fields);
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
        // Map client { key, value } → internal { fieldKey, value }
        const fieldKey = edit.key;

        const fieldDef = fieldDefMap.get(fieldKey);
        if (!fieldDef) {
          throw new ValidationError(`Unknown field key: ${fieldKey}`);
        }

        const fieldIndex = fields.findIndex((f) => f.key === fieldKey);
        const oldValue = fieldIndex >= 0 ? fields[fieldIndex].value : undefined;

        if (fieldIndex >= 0) {
          fields[fieldIndex].value = edit.value;
          fields[fieldIndex].status = 'user_edited';
        } else {
          fields.push({
            key: fieldKey,
            value: edit.value,
            status: 'user_edited',
          });
        }

        editHistory.push({
          fieldKey,
          oldValue,
          newValue: edit.value,
          editedAt: now,
          editedBy: 'customer',
        });

        await audit.logFieldEdited(tenantId, sessionId, undefined, fieldKey, oldValue, edit.value);
      }
    }

    // Update submission to confirmed
    const confirmedAt = new Date();
    await db
      .update(submissions)
      .set({
        status: 'confirmed',
        confirmedBy: 'customer',
        confirmedAt,
        fields,
        editHistory,
        updatedAt: confirmedAt,
      })
      .where(eq(submissions.id, sessionId));

    // Audit log confirmation
    await audit.logSubmissionConfirmed(tenantId, sessionId, undefined, 'customer');

    // Queue webhook deliveries (same as submissions.ts)
    const activeWebhooks = await db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.tenantId, tenantId), eq(webhooks.isActive, true)));

    const webhookService = getWebhookService(db);

    const webhookPayload: WebhookPayload = {
      event: 'submission.confirmed',
      submissionId: sessionId,
      tenantId,
      submission: {
        id: sessionId,
        schemaId: submission.schemaId,
        schemaVersion: submission.schemaVersion,
        websiteUrl: submission.websiteUrl,
        status: 'confirmed',
        fields,
        confirmedAt: confirmedAt.toISOString(),
        confirmedBy: 'customer',
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
      .where(eq(workflowRuns.submissionId, sessionId))
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

    const webhooksToDeliver = activeWebhooks.filter((webhook) =>
      webhook.events?.includes('submission.confirmed'),
    );

    // Fire-and-forget: don't block the public response on webhook delivery
    void Promise.all(
      webhooksToDeliver.map((webhook) => {
        let signingSecret: string;
        try {
          signingSecret = isEncrypted(webhook.secret) ? decrypt(webhook.secret) : webhook.secret;
        } catch (err) {
          log.error('Failed to decrypt webhook secret', { webhookId: webhook.id, error: err instanceof Error ? err.message : String(err) });
          return { success: false, deliveryId: '', error: 'Decryption failed' };
        }
        return webhookService.deliverImmediately(
          webhook.id,
          sessionId,
          'submission.confirmed',
          webhookPayload,
          webhook.endpointUrl,
          signingSecret,
        );
      }),
    ).catch((err: unknown) =>
      log.error('Webhook delivery failed', { sessionId, error: err instanceof Error ? err.message : String(err) }),
    );

    // Load schema version for field labels in response
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
    const responseFields = mapFieldsForClient(fields, fieldDefMap);

    return c.json({
      sessionId,
      fields: responseFields,
      confirmedAt: confirmedAt.toISOString(),
    });
  });

  return route;
}

const publicSessionsRoute = createPublicSessionsRoute(getWorkflowDeps() ?? undefined);
export default publicSessionsRoute;
