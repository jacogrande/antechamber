import { describe, it, expect } from 'bun:test';
import { Hono } from 'hono';
import { z } from 'zod';
import { errorHandler } from '../../src/middleware/error-handler';
import { ValidationError, NotFoundError } from '../../src/lib/errors';
import { createSubmissionRequestSchema, confirmSubmissionRequestSchema } from '../../src/types/api';
import type { FieldDefinition } from '../../src/types/api';
import type { StepRecord } from '../../src/lib/workflow/types';
import { generateCsv } from '../../src/lib/export/csv';
import { generateContextPack } from '../../src/lib/export/context-pack';

/**
 * Submission route tests.
 *
 * Stub-based: builds a minimal Hono app that replicates route behavior
 * without depending on a real database or workflow runner.
 */

interface StoredSchema {
  id: string;
  tenantId: string;
  name: string;
}

interface StoredVersion {
  id: string;
  schemaId: string;
  version: number;
  fields: unknown;
}

interface StoredSubmission {
  id: string;
  tenantId: string;
  schemaId: string;
  schemaVersion: number;
  websiteUrl: string;
  status: string;
  fields: unknown;
  customerMeta: unknown;
  confirmedBy: string | null;
  confirmedAt: string | null;
  editHistory?: unknown;
  createdAt: string;
  updatedAt: string;
}

interface StoredWebhook {
  id: string;
  tenantId: string;
  endpointUrl: string;
  secret: string;
  events: string[];
  isActive: boolean;
  simulateFailure?: boolean;
}

interface StoredWorkflowRun {
  id: string;
  submissionId: string;
  workflowName: string;
  status: string;
  steps: StepRecord[];
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

function createSubmissionsTestApp(options: {
  schemas?: StoredSchema[];
  versions?: StoredVersion[];
  submissions?: StoredSubmission[];
  workflowRuns?: StoredWorkflowRun[];
  webhooks?: StoredWebhook[];
  tenantId?: string;
} = {}) {
  const tenantId = options.tenantId ?? 'tenant-1';
  const storedSchemas: StoredSchema[] = options.schemas ? [...options.schemas] : [];
  const storedVersions: StoredVersion[] = options.versions ? [...options.versions] : [];
  const storedSubmissions: StoredSubmission[] = options.submissions
    ? [...options.submissions]
    : [];
  const storedWorkflowRuns: StoredWorkflowRun[] = options.workflowRuns
    ? [...options.workflowRuns]
    : [];
  const storedWebhooks: StoredWebhook[] = options.webhooks ? [...options.webhooks] : [];

  // Generate valid UUIDs for new submissions/runs
  let nextSubNum = storedSubmissions.length + 1;
  let nextRunNum = storedWorkflowRuns.length + 1;
  const makeSubUuid = (n: number) => `30000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
  const makeRunUuid = (n: number) => `40000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

  const app = new Hono();
  app.onError(errorHandler);

  // POST /api/submissions
  app.post('/api/submissions', async (c) => {
    const body = await c.req.json();
    const parsed = createSubmissionRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.flatten());
    }

    // Verify schema exists and belongs to tenant
    const schema = storedSchemas.find(
      (s) => s.id === parsed.data.schemaId && s.tenantId === tenantId,
    );
    if (!schema) {
      throw new NotFoundError('Schema not found');
    }

    // Resolve version
    let resolvedVersion: number;
    if (parsed.data.schemaVersion !== undefined) {
      const version = storedVersions.find(
        (v) =>
          v.schemaId === parsed.data.schemaId &&
          v.version === parsed.data.schemaVersion,
      );
      if (!version) {
        throw new NotFoundError('Schema version not found');
      }
      resolvedVersion = version.version;
    } else {
      const versions = storedVersions.filter(
        (v) => v.schemaId === parsed.data.schemaId,
      );
      if (versions.length === 0) {
        throw new NotFoundError('No versions found for schema');
      }
      resolvedVersion = Math.max(...versions.map((v) => v.version));
    }

    const submission: StoredSubmission = {
      id: makeSubUuid(nextSubNum++),
      tenantId,
      schemaId: parsed.data.schemaId,
      schemaVersion: resolvedVersion,
      websiteUrl: parsed.data.websiteUrl,
      status: 'pending',
      fields: null,
      customerMeta: parsed.data.customerMeta ?? null,
      confirmedBy: null,
      confirmedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    storedSubmissions.push(submission);

    const workflowRun: StoredWorkflowRun = {
      id: makeRunUuid(nextRunNum++),
      submissionId: submission.id,
      workflowName: 'generate_onboarding_draft',
      status: 'pending',
      steps: [],
      error: null,
      startedAt: null,
      completedAt: null,
    };
    storedWorkflowRuns.push(workflowRun);

    // No fire-and-forget in tests — just return IDs
    return c.json(
      {
        submissionId: submission.id,
        workflowRunId: workflowRun.id,
      },
      202,
    );
  });

  // GET /api/submissions/:submissionId
  app.get('/api/submissions/:submissionId', async (c) => {
    const submissionId = c.req.param('submissionId');

    // Validate UUID format
    const uuidResult = z.string().uuid().safeParse(submissionId);
    if (!uuidResult.success) {
      throw new ValidationError('Invalid submission ID format');
    }

    const submission = storedSubmissions.find(
      (s) => s.id === submissionId && s.tenantId === tenantId,
    );

    if (!submission) {
      throw new NotFoundError('Submission not found');
    }

    const latestRun = storedWorkflowRuns
      .filter((r) => r.submissionId === submissionId)
      .pop();

    const sanitizedSteps = latestRun
      ? latestRun.steps.map((s) => ({
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

  // POST /api/submissions/:submissionId/confirm
  app.post('/api/submissions/:submissionId/confirm', async (c) => {
    const submissionId = c.req.param('submissionId');

    const uuidResult = z.string().uuid().safeParse(submissionId);
    if (!uuidResult.success) {
      throw new ValidationError('Invalid submission ID format');
    }

    const body = await c.req.json();
    const parsed = confirmSubmissionRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.flatten());
    }

    const submission = storedSubmissions.find(
      (s) => s.id === submissionId && s.tenantId === tenantId,
    );

    if (!submission) {
      throw new NotFoundError('Submission not found');
    }

    if (submission.status !== 'draft') {
      throw new ValidationError('Submission must be in draft status to confirm');
    }

    const version = storedVersions.find(
      (v) => v.schemaId === submission.schemaId && v.version === submission.schemaVersion,
    );
    const fieldDefs = (version?.fields as FieldDefinition[]) ?? [];
    const fieldDefMap = new Map(fieldDefs.map((f) => [f.key, f]));

    const fields = (submission.fields as Array<{ key: string; value: unknown; status?: string }>) ?? [];
    const editHistory: Array<{ fieldKey: string; oldValue: unknown; newValue: unknown; editedAt: string; editedBy: string }> =
      (submission.editHistory as any) ?? [];

    // Apply edits
    if (parsed.data.edits) {
      for (const edit of parsed.data.edits) {
        if (!fieldDefMap.has(edit.fieldKey)) {
          throw new ValidationError(`Unknown field key: ${edit.fieldKey}`);
        }

        const fieldIndex = fields.findIndex((f) => f.key === edit.fieldKey);
        const oldValue = fieldIndex >= 0 ? fields[fieldIndex].value : undefined;

        if (fieldIndex >= 0) {
          fields[fieldIndex].value = edit.value;
          fields[fieldIndex].status = 'user_edited';
        } else {
          fields.push({ key: edit.fieldKey, value: edit.value, status: 'user_edited' });
        }

        editHistory.push({
          fieldKey: edit.fieldKey,
          oldValue,
          newValue: edit.value,
          editedAt: new Date().toISOString(),
          editedBy: 'user-1',
        });
      }
    }

    const confirmedAt = new Date().toISOString();
    submission.status = 'confirmed';
    submission.confirmedBy = parsed.data.confirmedBy;
    submission.confirmedAt = confirmedAt;
    submission.fields = fields;
    submission.editHistory = editHistory;

    // Deliver webhooks (simulates sync delivery like production)
    const activeWebhooks = storedWebhooks.filter(
      (w) => w.tenantId === tenantId && w.isActive && w.events.includes('submission.confirmed'),
    );
    let webhooksDelivered = 0;
    let webhooksFailed = 0;
    for (const webhook of activeWebhooks) {
      if (webhook.simulateFailure) {
        webhooksFailed++;
      } else {
        webhooksDelivered++;
      }
    }

    return c.json({
      submission: {
        id: submissionId,
        status: 'confirmed',
        confirmedAt,
        confirmedBy: parsed.data.confirmedBy,
        fields,
        editHistory,
      },
      webhooksDelivered,
      webhooksFailed,
    });
  });

  // GET /api/submissions/:submissionId/artifacts
  app.get('/api/submissions/:submissionId/artifacts', async (c) => {
    const submissionId = c.req.param('submissionId');

    const uuidResult = z.string().uuid().safeParse(submissionId);
    if (!uuidResult.success) {
      throw new ValidationError('Invalid submission ID format');
    }

    const submission = storedSubmissions.find(
      (s) => s.id === submissionId && s.tenantId === tenantId,
    );

    if (!submission) {
      throw new NotFoundError('Submission not found');
    }

    const latestRun = storedWorkflowRuns
      .filter((r) => r.submissionId === submissionId)
      .pop();

    if (!latestRun || latestRun.status !== 'completed') {
      throw new ValidationError('Workflow has not completed');
    }

    const steps = latestRun.steps ?? [];
    const crawlStep = steps.find((s) => s.name === 'crawl');
    const output = crawlStep?.output as {
      pages?: Array<{ url: string }>;
      artifactKeys?: string[];
    } | undefined;

    const artifactKeys = output?.artifactKeys ?? [];
    const pages = output?.pages ?? [];

    const artifacts = artifactKeys.map((key, index) => ({
      url: pages[index]?.url ?? key,
      type: key.endsWith('.html') ? 'raw_html' : 'extracted_text',
      signedUrl: `https://stub-storage.local/${key}?expires=2025-01-01T01:00:00Z`,
      expiresAt: '2025-01-01T01:00:00.000Z',
    }));

    return c.json({ artifacts });
  });

  // GET /api/submissions/:submissionId/export/csv
  app.get('/api/submissions/:submissionId/export/csv', async (c) => {
    const submissionId = c.req.param('submissionId');

    const uuidResult = z.string().uuid().safeParse(submissionId);
    if (!uuidResult.success) {
      throw new ValidationError('Invalid submission ID format');
    }

    const submission = storedSubmissions.find(
      (s) => s.id === submissionId && s.tenantId === tenantId,
    );

    if (!submission) {
      throw new NotFoundError('Submission not found');
    }

    if (submission.status !== 'confirmed') {
      throw new ValidationError('Submission must be confirmed to export');
    }

    const version = storedVersions.find(
      (v) => v.schemaId === submission.schemaId && v.version === submission.schemaVersion,
    );
    const fieldDefs = (version?.fields as FieldDefinition[]) ?? [];
    const fields = (submission.fields as Array<{ key: string; value: unknown; citations?: Array<{ url?: string; snippet?: string }> }>) ?? [];

    const csv = generateCsv(
      {
        id: submission.id,
        websiteUrl: submission.websiteUrl,
        fields,
        confirmedAt: submission.confirmedAt ?? new Date().toISOString(),
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
  app.get('/api/submissions/:submissionId/context-pack', async (c) => {
    const submissionId = c.req.param('submissionId');

    const uuidResult = z.string().uuid().safeParse(submissionId);
    if (!uuidResult.success) {
      throw new ValidationError('Invalid submission ID format');
    }

    const submission = storedSubmissions.find(
      (s) => s.id === submissionId && s.tenantId === tenantId,
    );

    if (!submission) {
      throw new NotFoundError('Submission not found');
    }

    if (submission.status !== 'confirmed') {
      throw new ValidationError('Submission must be confirmed to get context pack');
    }

    const latestRun = storedWorkflowRuns
      .filter((r) => r.submissionId === submissionId)
      .pop();

    const steps = latestRun?.steps ?? [];
    const crawlStep = steps.find((s) => s.name === 'crawl');
    const output = crawlStep?.output as {
      pages?: Array<{ url: string; title?: string; fetchedAt?: string }>;
    } | undefined;

    const artifacts = (output?.pages ?? []).map((p) => ({
      url: p.url,
      title: p.title,
      retrievedAt: p.fetchedAt ?? new Date().toISOString(),
    }));

    const fields = (submission.fields as Array<{
      key: string;
      value: unknown;
      confidence?: number;
      citations?: Array<{ url?: string; snippet?: string; title?: string }>;
      status?: string;
    }>) ?? [];

    const contextPack = generateContextPack(
      {
        id: submission.id,
        schemaId: submission.schemaId,
        schemaVersion: submission.schemaVersion,
        websiteUrl: submission.websiteUrl,
        fields,
        confirmedAt: submission.confirmedAt ?? new Date().toISOString(),
      },
      artifacts,
    );

    return c.json(contextPack);
  });

  return app;
}

// --- Helpers ---

const SCHEMA_UUID = '10000000-0000-0000-0000-000000000001';

const EXISTING_SCHEMA: StoredSchema = {
  id: SCHEMA_UUID,
  tenantId: 'tenant-1',
  name: 'Onboarding',
};

const EXISTING_VERSION: StoredVersion = {
  id: 'version-1',
  schemaId: SCHEMA_UUID,
  version: 1,
  fields: [
    {
      key: 'company_name',
      label: 'Company Name',
      type: 'string',
      required: true,
      instructions: 'Extract the official company name',
    },
  ],
};

const EXISTING_VERSION_2: StoredVersion = {
  id: 'version-2',
  schemaId: SCHEMA_UUID,
  version: 2,
  fields: [
    {
      key: 'company_name',
      label: 'Company Name',
      type: 'string',
      required: true,
      instructions: 'Extract the official company name v2',
    },
  ],
};

const SUBMISSION_UUID = '20000000-0000-0000-0000-000000000001';

const EXISTING_SUBMISSION: StoredSubmission = {
  id: SUBMISSION_UUID,
  tenantId: 'tenant-1',
  schemaId: SCHEMA_UUID,
  schemaVersion: 1,
  websiteUrl: 'https://example.com',
  status: 'draft',
  fields: [
    {
      key: 'company_name',
      value: 'Acme Corp',
      confidence: 0.95,
      citations: [],
      status: 'auto',
    },
  ],
  customerMeta: null,
  confirmedBy: null,
  confirmedAt: null,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

const EXISTING_WORKFLOW_RUN: StoredWorkflowRun = {
  id: 'run-existing',
  submissionId: SUBMISSION_UUID,
  workflowName: 'generate_onboarding_draft',
  status: 'completed',
  steps: [
    {
      name: 'validate',
      status: 'completed',
      startedAt: '2025-01-01T00:00:00.000Z',
      completedAt: '2025-01-01T00:00:01.000Z',
      output: null,
      error: null,
      attempts: 1,
    },
  ],
  error: null,
  startedAt: '2025-01-01T00:00:00.000Z',
  completedAt: '2025-01-01T00:00:05.000Z',
};

function postSubmission(
  app: ReturnType<typeof createSubmissionsTestApp>,
  body: unknown,
) {
  return app.request('/api/submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function getSubmission(
  app: ReturnType<typeof createSubmissionsTestApp>,
  submissionId: string,
) {
  return app.request(`/api/submissions/${submissionId}`);
}

// =====================
// POST /api/submissions
// =====================

describe('POST /api/submissions', () => {
  it('creates submission → 202 with IDs', async () => {
    const app = createSubmissionsTestApp({
      schemas: [EXISTING_SCHEMA],
      versions: [EXISTING_VERSION],
    });
    const res = await postSubmission(app, {
      schemaId: SCHEMA_UUID,
      websiteUrl: 'https://example.com',
    });
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.submissionId).toBeDefined();
    expect(body.workflowRunId).toBeDefined();
  });

  it('rejects missing schemaId → 400', async () => {
    const app = createSubmissionsTestApp({
      schemas: [EXISTING_SCHEMA],
      versions: [EXISTING_VERSION],
    });
    const res = await postSubmission(app, {
      websiteUrl: 'https://example.com',
    });
    expect(res.status).toBe(400);
  });

  it('rejects invalid websiteUrl → 400', async () => {
    const app = createSubmissionsTestApp({
      schemas: [EXISTING_SCHEMA],
      versions: [EXISTING_VERSION],
    });
    const res = await postSubmission(app, {
      schemaId: SCHEMA_UUID,
      websiteUrl: 'not-a-url',
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 for nonexistent schemaId', async () => {
    const app = createSubmissionsTestApp({
      schemas: [EXISTING_SCHEMA],
      versions: [EXISTING_VERSION],
    });
    const res = await postSubmission(app, {
      schemaId: '00000000-0000-0000-0000-000000000000',
      websiteUrl: 'https://example.com',
    });
    expect(res.status).toBe(404);
  });

  it('resolves latest schema version when omitted', async () => {
    const app = createSubmissionsTestApp({
      schemas: [EXISTING_SCHEMA],
      versions: [EXISTING_VERSION, EXISTING_VERSION_2],
    });
    const res = await postSubmission(app, {
      schemaId: SCHEMA_UUID,
      websiteUrl: 'https://example.com',
    });
    expect(res.status).toBe(202);
    // The submission was created — we verify via GET
    const body = await res.json();
    const getRes = await getSubmission(app, body.submissionId);
    const getData = await getRes.json();
    expect(getData.submission.schemaVersion).toBe(2);
  });

  it('rejects invalid schemaId format → 400', async () => {
    const app = createSubmissionsTestApp({
      schemas: [EXISTING_SCHEMA],
      versions: [EXISTING_VERSION],
    });
    const res = await postSubmission(app, {
      schemaId: 'not-a-uuid',
      websiteUrl: 'https://example.com',
    });
    expect(res.status).toBe(400);
  });

  it('passes customerMeta through', async () => {
    const app = createSubmissionsTestApp({
      schemas: [EXISTING_SCHEMA],
      versions: [EXISTING_VERSION],
    });
    const res = await postSubmission(app, {
      schemaId: SCHEMA_UUID,
      websiteUrl: 'https://example.com',
      customerMeta: { source: 'signup' },
    });
    expect(res.status).toBe(202);
    const body = await res.json();
    const getRes = await getSubmission(app, body.submissionId);
    const getData = await getRes.json();
    expect(getData.submission.customerMeta).toEqual({ source: 'signup' });
  });
});

// =====================
// GET /api/submissions/:submissionId
// =====================

describe('GET /api/submissions/:submissionId', () => {
  it('returns submission with workflow status', async () => {
    const app = createSubmissionsTestApp({
      schemas: [EXISTING_SCHEMA],
      versions: [EXISTING_VERSION],
      submissions: [EXISTING_SUBMISSION],
      workflowRuns: [EXISTING_WORKFLOW_RUN],
    });

    const res = await getSubmission(app, SUBMISSION_UUID);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.submission.id).toBe(SUBMISSION_UUID);
    expect(body.submission.status).toBe('draft');
    expect(body.submission.fields).toBeDefined();
    expect(body.workflow).toBeDefined();
    expect(body.workflow.id).toBe('run-existing');
    expect(body.workflow.status).toBe('completed');
    expect(body.workflow.steps).toHaveLength(1);
    // Step outputs should be stripped
    expect(body.workflow.steps[0].output).toBeUndefined();
  });

  it('returns 404 for nonexistent submission', async () => {
    const app = createSubmissionsTestApp({
      schemas: [EXISTING_SCHEMA],
      versions: [EXISTING_VERSION],
    });
    // Use a valid UUID format that doesn't exist
    const res = await getSubmission(app, '00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid submission ID format', async () => {
    const app = createSubmissionsTestApp({
      schemas: [EXISTING_SCHEMA],
      versions: [EXISTING_VERSION],
    });
    const res = await getSubmission(app, 'not-a-uuid');
    expect(res.status).toBe(400);
  });

  it('scopes to tenant (other tenant → 404)', async () => {
    const otherTenantSubmission: StoredSubmission = {
      ...EXISTING_SUBMISSION,
      tenantId: 'other-tenant',
    };
    const app = createSubmissionsTestApp({
      schemas: [EXISTING_SCHEMA],
      versions: [EXISTING_VERSION],
      submissions: [otherTenantSubmission],
      workflowRuns: [EXISTING_WORKFLOW_RUN],
    });

    const res = await getSubmission(app, SUBMISSION_UUID);
    expect(res.status).toBe(404);
  });
});

// --- Additional helpers ---

function confirmSubmission(app: Hono, submissionId: string, body: unknown) {
  return app.request(`/api/submissions/${submissionId}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function getArtifacts(app: Hono, submissionId: string) {
  return app.request(`/api/submissions/${submissionId}/artifacts`);
}

function getCsv(app: Hono, submissionId: string) {
  return app.request(`/api/submissions/${submissionId}/export/csv`);
}

function getContextPack(app: Hono, submissionId: string) {
  return app.request(`/api/submissions/${submissionId}/context-pack`);
}

const CONFIRMED_SUBMISSION: StoredSubmission = {
  id: '20000000-0000-0000-0000-000000000002',
  tenantId: 'tenant-1',
  schemaId: SCHEMA_UUID,
  schemaVersion: 1,
  websiteUrl: 'https://example.com',
  status: 'confirmed',
  fields: [
    {
      key: 'company_name',
      value: 'Acme Corp',
      confidence: 0.95,
      citations: [{ url: 'https://example.com/about', snippet: 'Welcome to Acme Corp' }],
      status: 'auto',
    },
  ],
  customerMeta: null,
  confirmedBy: 'customer',
  confirmedAt: '2025-01-01T00:00:00.000Z',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

const WORKFLOW_WITH_CRAWL: StoredWorkflowRun = {
  id: 'run-with-crawl',
  submissionId: SUBMISSION_UUID,
  workflowName: 'generate_onboarding_draft',
  status: 'completed',
  steps: [
    {
      name: 'crawl',
      status: 'completed',
      startedAt: '2025-01-01T00:00:00.000Z',
      completedAt: '2025-01-01T00:00:01.000Z',
      output: {
        pages: [
          { url: 'https://example.com', title: 'Home', fetchedAt: '2025-01-01T00:00:00.000Z' },
          { url: 'https://example.com/about', title: 'About', fetchedAt: '2025-01-01T00:00:01.000Z' },
        ],
        artifactKeys: ['example.com/index.html', 'example.com/about.html'],
      },
      error: null,
      attempts: 1,
    },
  ],
  error: null,
  startedAt: '2025-01-01T00:00:00.000Z',
  completedAt: '2025-01-01T00:00:05.000Z',
};

// =====================
// POST /api/submissions/:submissionId/confirm
// =====================

describe('POST /api/submissions/:submissionId/confirm', () => {
  it('confirms draft submission → 200', async () => {
    const app = createSubmissionsTestApp({
      schemas: [EXISTING_SCHEMA],
      versions: [EXISTING_VERSION],
      submissions: [{ ...EXISTING_SUBMISSION }],
      workflowRuns: [EXISTING_WORKFLOW_RUN],
    });

    const res = await confirmSubmission(app, SUBMISSION_UUID, {
      confirmedBy: 'customer',
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.submission.status).toBe('confirmed');
    expect(body.submission.confirmedBy).toBe('customer');
    expect(body.submission.confirmedAt).toBeDefined();
  });

  it('rejects non-draft submission → 400', async () => {
    const app = createSubmissionsTestApp({
      schemas: [EXISTING_SCHEMA],
      versions: [EXISTING_VERSION],
      submissions: [CONFIRMED_SUBMISSION],
      workflowRuns: [EXISTING_WORKFLOW_RUN],
    });

    const res = await confirmSubmission(app, CONFIRMED_SUBMISSION.id, {
      confirmedBy: 'customer',
    });

    expect(res.status).toBe(400);
  });

  it('applies edits and records history', async () => {
    const app = createSubmissionsTestApp({
      schemas: [EXISTING_SCHEMA],
      versions: [EXISTING_VERSION],
      submissions: [{ ...EXISTING_SUBMISSION }],
      workflowRuns: [EXISTING_WORKFLOW_RUN],
    });

    const res = await confirmSubmission(app, SUBMISSION_UUID, {
      confirmedBy: 'internal',
      edits: [{ fieldKey: 'company_name', value: 'New Name' }],
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.submission.fields[0].value).toBe('New Name');
    expect(body.submission.fields[0].status).toBe('user_edited');
    expect(body.submission.editHistory).toHaveLength(1);
    expect(body.submission.editHistory[0].fieldKey).toBe('company_name');
    expect(body.submission.editHistory[0].oldValue).toBe('Acme Corp');
    expect(body.submission.editHistory[0].newValue).toBe('New Name');
  });

  it('rejects unknown field key → 400', async () => {
    const app = createSubmissionsTestApp({
      schemas: [EXISTING_SCHEMA],
      versions: [EXISTING_VERSION],
      submissions: [{ ...EXISTING_SUBMISSION }],
      workflowRuns: [EXISTING_WORKFLOW_RUN],
    });

    const res = await confirmSubmission(app, SUBMISSION_UUID, {
      confirmedBy: 'customer',
      edits: [{ fieldKey: 'unknown_field', value: 'test' }],
    });

    expect(res.status).toBe(400);
  });

  it('returns 404 for nonexistent submission', async () => {
    const app = createSubmissionsTestApp({
      schemas: [EXISTING_SCHEMA],
      versions: [EXISTING_VERSION],
    });

    const res = await confirmSubmission(app, '00000000-0000-0000-0000-000000000000', {
      confirmedBy: 'customer',
    });

    expect(res.status).toBe(404);
  });

  it('scopes to tenant', async () => {
    const otherTenantSubmission: StoredSubmission = {
      ...EXISTING_SUBMISSION,
      tenantId: 'other-tenant',
    };
    const app = createSubmissionsTestApp({
      schemas: [EXISTING_SCHEMA],
      versions: [EXISTING_VERSION],
      submissions: [otherTenantSubmission],
    });

    const res = await confirmSubmission(app, SUBMISSION_UUID, {
      confirmedBy: 'customer',
    });

    expect(res.status).toBe(404);
  });

  it('queues webhooks on confirm', async () => {
    const app = createSubmissionsTestApp({
      schemas: [EXISTING_SCHEMA],
      versions: [EXISTING_VERSION],
      submissions: [{ ...EXISTING_SUBMISSION }],
      workflowRuns: [EXISTING_WORKFLOW_RUN],
      webhooks: [
        {
          id: 'webhook-1',
          tenantId: 'tenant-1',
          endpointUrl: 'https://example.com/webhook',
          secret: 'secret',
          events: ['submission.confirmed'],
          isActive: true,
        },
      ],
    });

    const res = await confirmSubmission(app, SUBMISSION_UUID, {
      confirmedBy: 'customer',
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.webhooksDelivered).toBe(1);
    expect(body.webhooksFailed).toBe(0);
  });

  it('reports failed webhook deliveries', async () => {
    const app = createSubmissionsTestApp({
      schemas: [EXISTING_SCHEMA],
      versions: [EXISTING_VERSION],
      submissions: [{ ...EXISTING_SUBMISSION }],
      workflowRuns: [EXISTING_WORKFLOW_RUN],
      webhooks: [
        {
          id: 'webhook-1',
          tenantId: 'tenant-1',
          endpointUrl: 'https://example.com/webhook',
          secret: 'secret',
          events: ['submission.confirmed'],
          isActive: true,
        },
        {
          id: 'webhook-2',
          tenantId: 'tenant-1',
          endpointUrl: 'https://failing.example.com/webhook',
          secret: 'secret',
          events: ['submission.confirmed'],
          isActive: true,
          simulateFailure: true,
        },
      ],
    });

    const res = await confirmSubmission(app, SUBMISSION_UUID, {
      confirmedBy: 'customer',
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.webhooksDelivered).toBe(1);
    expect(body.webhooksFailed).toBe(1);
  });
});

// =====================
// GET /api/submissions/:submissionId/artifacts
// =====================

describe('GET /api/submissions/:submissionId/artifacts', () => {
  it('returns signed URLs for artifacts', async () => {
    const app = createSubmissionsTestApp({
      schemas: [EXISTING_SCHEMA],
      versions: [EXISTING_VERSION],
      submissions: [EXISTING_SUBMISSION],
      workflowRuns: [WORKFLOW_WITH_CRAWL],
    });

    const res = await getArtifacts(app, SUBMISSION_UUID);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.artifacts).toHaveLength(2);
    expect(body.artifacts[0].signedUrl).toContain('stub-storage.local');
    expect(body.artifacts[0].type).toBe('raw_html');
  });

  it('returns 400 if workflow not completed', async () => {
    const pendingRun: StoredWorkflowRun = {
      ...EXISTING_WORKFLOW_RUN,
      status: 'running',
    };
    const app = createSubmissionsTestApp({
      schemas: [EXISTING_SCHEMA],
      versions: [EXISTING_VERSION],
      submissions: [EXISTING_SUBMISSION],
      workflowRuns: [pendingRun],
    });

    const res = await getArtifacts(app, SUBMISSION_UUID);

    expect(res.status).toBe(400);
  });

  it('returns 404 for missing submission', async () => {
    const app = createSubmissionsTestApp({
      schemas: [EXISTING_SCHEMA],
      versions: [EXISTING_VERSION],
    });

    const res = await getArtifacts(app, '00000000-0000-0000-0000-000000000000');

    expect(res.status).toBe(404);
  });
});

// =====================
// GET /api/submissions/:submissionId/export/csv
// =====================

describe('GET /api/submissions/:submissionId/export/csv', () => {
  it('returns CSV for confirmed submission', async () => {
    const app = createSubmissionsTestApp({
      schemas: [EXISTING_SCHEMA],
      versions: [EXISTING_VERSION],
      submissions: [CONFIRMED_SUBMISSION],
      workflowRuns: [EXISTING_WORKFLOW_RUN],
    });

    const res = await getCsv(app, CONFIRMED_SUBMISSION.id);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/csv');
    expect(res.headers.get('Content-Disposition')).toContain('attachment');

    const csv = await res.text();
    expect(csv).toContain('company_name');
    expect(csv).toContain('Acme Corp');
  });

  it('returns 400 if not confirmed', async () => {
    const app = createSubmissionsTestApp({
      schemas: [EXISTING_SCHEMA],
      versions: [EXISTING_VERSION],
      submissions: [EXISTING_SUBMISSION], // draft status
      workflowRuns: [EXISTING_WORKFLOW_RUN],
    });

    const res = await getCsv(app, SUBMISSION_UUID);

    expect(res.status).toBe(400);
  });

  it('returns 404 for missing submission', async () => {
    const app = createSubmissionsTestApp({
      schemas: [EXISTING_SCHEMA],
      versions: [EXISTING_VERSION],
    });

    const res = await getCsv(app, '00000000-0000-0000-0000-000000000000');

    expect(res.status).toBe(404);
  });
});

// =====================
// GET /api/submissions/:submissionId/context-pack
// =====================

describe('GET /api/submissions/:submissionId/context-pack', () => {
  it('returns context pack for confirmed submission', async () => {
    const confirmedWithCrawl: StoredSubmission = {
      ...CONFIRMED_SUBMISSION,
      id: SUBMISSION_UUID,
    };
    const app = createSubmissionsTestApp({
      schemas: [EXISTING_SCHEMA],
      versions: [EXISTING_VERSION],
      submissions: [confirmedWithCrawl],
      workflowRuns: [WORKFLOW_WITH_CRAWL],
    });

    const res = await getContextPack(app, SUBMISSION_UUID);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.context.submissionId).toBe(SUBMISSION_UUID);
    expect(body.context.fields).toHaveProperty('company_name', 'Acme Corp');
    expect(body.sources).toBeDefined();
    expect(body.metadata.version).toBe('1.0.0');
  });

  it('returns 400 if not confirmed', async () => {
    const app = createSubmissionsTestApp({
      schemas: [EXISTING_SCHEMA],
      versions: [EXISTING_VERSION],
      submissions: [EXISTING_SUBMISSION], // draft status
      workflowRuns: [WORKFLOW_WITH_CRAWL],
    });

    const res = await getContextPack(app, SUBMISSION_UUID);

    expect(res.status).toBe(400);
  });

  it('returns 404 for missing submission', async () => {
    const app = createSubmissionsTestApp({
      schemas: [EXISTING_SCHEMA],
      versions: [EXISTING_VERSION],
    });

    const res = await getContextPack(app, '00000000-0000-0000-0000-000000000000');

    expect(res.status).toBe(404);
  });
});
