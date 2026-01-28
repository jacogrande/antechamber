import { describe, it, expect } from 'bun:test';
import { Hono } from 'hono';
import { z } from 'zod';
import { errorHandler } from '../../src/middleware/error-handler';
import { ValidationError, NotFoundError } from '../../src/lib/errors';
import { createSubmissionRequestSchema } from '../../src/types/api';
import type { StepRecord } from '../../src/lib/workflow/types';

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
  createdAt: string;
  updatedAt: string;
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
