import { describe, it, expect, beforeAll } from 'bun:test';
import { Hono } from 'hono';
import { z } from 'zod';
import { errorHandler } from '../../src/middleware/error-handler';
import { ValidationError, NotFoundError, UnauthorizedError } from '../../src/lib/errors';
import { signSessionToken, verifySessionToken } from '../../src/lib/session-token';
import { resetEnvCache } from '../../src/env';

/**
 * Public session route tests.
 * Stub-based: builds a minimal Hono app that replicates route behavior.
 */

// Set up env before all tests
beforeAll(() => {
  process.env.SUPABASE_JWT_SECRET = 'test-secret-key-with-at-least-32-characters-for-security';
  process.env.PUBLIC_SESSION_SECRET = 'public-test-secret-key-with-at-least-32-characters';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  resetEnvCache();
});

// ---------------------------------------------------------------------------
// In-memory data types
// ---------------------------------------------------------------------------

interface StoredSchema {
  id: string;
  tenantId: string;
  name: string;
}

interface StoredSchemaVersion {
  schemaId: string;
  version: number;
  fields: Array<{ key: string; label: string; type: string; required: boolean; instructions: string }>;
}

interface StoredSubmission {
  id: string;
  tenantId: string;
  schemaId: string;
  schemaVersion: number;
  websiteUrl: string;
  status: 'pending' | 'draft' | 'confirmed' | 'failed';
  fields: Array<{
    key: string;
    value: unknown;
    confidence?: number;
    citations?: Array<{ url: string; snippet: string; pageTitle?: string; retrievedAt: string }>;
    status?: string;
    reason?: string;
  }> | null;
  customerMeta: unknown;
  confirmedBy: string | null;
  confirmedAt: string | null;
  editHistory: unknown[] | null;
}

interface StoredWorkflowRun {
  id: string;
  submissionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  steps: Array<{
    name: string;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
    output: unknown;
    error: string | null;
    attempts: number;
  }>;
}

// ---------------------------------------------------------------------------
// Zod schemas matching real route
// ---------------------------------------------------------------------------

const createSessionSchema = z.object({
  schemaId: z.string().uuid(),
  schemaVersion: z.coerce.number().int().positive().optional(),
  websiteUrl: z.string().url(),
  customer: z.object({ email: z.string().email().optional(), name: z.string().optional() }).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

const confirmSessionSchema = z.object({
  edits: z.array(z.object({ key: z.string(), value: z.unknown() })).optional(),
});

// Progress mapping
const PROGRESS_MAP: Record<string, { stage: string; message: string }> = {
  validate: { stage: 'validating', message: 'Validating your website...' },
  crawl: { stage: 'crawling', message: 'Crawling your website...' },
  extract: { stage: 'extracting', message: 'Extracting company information...' },
  persist_draft: { stage: 'finalizing', message: 'Finalizing draft...' },
};

// ---------------------------------------------------------------------------
// Test app type
// ---------------------------------------------------------------------------

type TestEnv = {
  Variables: {
    tenantId: string;
  };
};

// ---------------------------------------------------------------------------
// Test app factory
// ---------------------------------------------------------------------------

function createPublicSessionsTestApp(options: {
  schemas?: StoredSchema[];
  versions?: StoredSchemaVersion[];
  submissions?: StoredSubmission[];
  workflowRuns?: StoredWorkflowRun[];
  tenantId?: string;
} = {}) {
  const tenantId = options.tenantId ?? 'tenant-1';
  const storedSchemas: StoredSchema[] = options.schemas ? [...options.schemas] : [];
  const storedVersions: StoredSchemaVersion[] = options.versions ? [...options.versions] : [];
  const storedSubmissions: StoredSubmission[] = options.submissions ? [...options.submissions] : [];
  const storedRuns: StoredWorkflowRun[] = options.workflowRuns ? [...options.workflowRuns] : [];
  let nextSubNum = storedSubmissions.length + 1;
  let nextRunNum = storedRuns.length + 1;

  const makeUuid = (prefix: string, n: number) =>
    `${prefix}0000-0000-0000-0000-${String(n).padStart(12, '0')}`;

  const app = new Hono<TestEnv>();
  app.onError(errorHandler);

  // Stub publishable key middleware — set tenantId from context
  app.use('/public/*', async (c, next) => {
    c.set('tenantId', tenantId);
    await next();
  });

  // POST /public/sessions
  app.post('/public/sessions', async (c) => {
    const body = await c.req.json();
    const parsed = createSessionSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.flatten());
    }

    const schema = storedSchemas.find(
      (s) => s.id === parsed.data.schemaId && s.tenantId === tenantId,
    );
    if (!schema) {
      throw new NotFoundError('Schema not found');
    }

    let resolvedVersion: number;
    if (parsed.data.schemaVersion !== undefined) {
      const version = storedVersions.find(
        (v) => v.schemaId === parsed.data.schemaId && v.version === parsed.data.schemaVersion,
      );
      if (!version) throw new NotFoundError('Schema version not found');
      resolvedVersion = version.version;
    } else {
      const versions = storedVersions.filter((v) => v.schemaId === parsed.data.schemaId);
      if (versions.length === 0) throw new NotFoundError('No versions found for schema');
      resolvedVersion = Math.max(...versions.map((v) => v.version));
    }

    const submissionId = makeUuid('10000000', nextSubNum++);
    const workflowRunId = makeUuid('20000000', nextRunNum++);

    const submission: StoredSubmission = {
      id: submissionId,
      tenantId,
      schemaId: parsed.data.schemaId,
      schemaVersion: resolvedVersion,
      websiteUrl: parsed.data.websiteUrl,
      status: 'pending',
      fields: null,
      customerMeta: { customer: parsed.data.customer ?? null, metadata: parsed.data.metadata ?? null },
      confirmedBy: null,
      confirmedAt: null,
      editHistory: null,
    };
    storedSubmissions.push(submission);

    const run: StoredWorkflowRun = {
      id: workflowRunId,
      submissionId,
      status: 'pending',
      steps: [],
    };
    storedRuns.push(run);

    const sessionToken = await signSessionToken(submissionId, tenantId);

    return c.json({
      sessionId: submissionId,
      sessionToken,
      config: { reviewMode: 'blocking', reviewUrl: '' },
    }, 201);
  });

  // GET /public/sessions/:id
  app.get('/public/sessions/:id', async (c) => {
    const sessionId = c.req.param('id');

    // Verify session token
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }
    const tokenData = await verifySessionToken(authHeader.slice(7));
    if (tokenData.submissionId !== sessionId) {
      throw new UnauthorizedError('Token does not match session');
    }
    if (tokenData.tenantId !== tenantId) {
      throw new UnauthorizedError('Token does not match tenant');
    }

    const submission = storedSubmissions.find(
      (s) => s.id === sessionId && s.tenantId === tenantId,
    );
    if (!submission) throw new NotFoundError('Session not found');

    const latestRun = storedRuns
      .filter((r) => r.submissionId === sessionId)
      .pop();

    // Build progress
    let progress: Record<string, unknown> | undefined;
    if (submission.status === 'pending' && latestRun) {
      const runningStep = latestRun.steps.find((s) => s.status === 'running');
      const lastCompleted = [...latestRun.steps].reverse().find((s) => s.status === 'completed');
      const activeStep = runningStep ?? lastCompleted;
      if (activeStep) {
        const mapped = PROGRESS_MAP[activeStep.name];
        if (mapped) {
          progress = { stage: mapped.stage, message: mapped.message };
          const crawlStep = latestRun.steps.find((s) => s.name === 'crawl');
          if (crawlStep?.output) {
            const output = crawlStep.output as { pageCount?: number };
            if (output.pageCount !== undefined) {
              progress.pagesFound = output.pageCount;
              if (crawlStep.status === 'completed') {
                progress.pagesCrawled = output.pageCount;
              }
            }
          }
        }
      }
    }

    // Build draft
    let draft: { fields: unknown[] } | undefined;
    if ((submission.status === 'draft' || submission.status === 'confirmed') && submission.fields) {
      const version = storedVersions.find(
        (v) => v.schemaId === submission.schemaId && v.version === submission.schemaVersion,
      );
      const fieldDefMap = new Map(
        (version?.fields ?? []).map((f) => [f.key, f]),
      );

      draft = {
        fields: submission.fields.map((f) => {
          const def = fieldDefMap.get(f.key);
          return {
            key: f.key,
            label: def?.label ?? f.key,
            type: def?.type,
            value: f.value,
            status: f.status ?? 'unknown',
            confidence: f.confidence ?? 0,
            reason: f.reason,
            citations: (f.citations ?? []).map((cit) => ({
              url: cit.url ?? '',
              snippet: cit.snippet ?? '',
              pageTitle: cit.pageTitle ?? '',
              retrievedAt: cit.retrievedAt ?? '',
            })),
          };
        }),
      };
    }

    let clientStatus: string = submission.status;
    if (submission.status === 'pending') clientStatus = 'processing';

    let error: { message: string; code?: string } | undefined;
    if (submission.status === 'failed') {
      const failedStep = latestRun?.steps.find((s) => s.status === 'failed');
      error = { message: failedStep?.error ?? 'An unexpected error occurred', code: 'WORKFLOW_FAILED' };
    }

    return c.json({
      sessionId,
      status: clientStatus,
      ...(progress && { progress }),
      ...(draft && { draft }),
      ...(error && { error }),
    });
  });

  // POST /public/sessions/:id/confirm
  app.post('/public/sessions/:id/confirm', async (c) => {
    const sessionId = c.req.param('id');

    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }
    const tokenData = await verifySessionToken(authHeader.slice(7));
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

    const submission = storedSubmissions.find(
      (s) => s.id === sessionId && s.tenantId === tenantId,
    );
    if (!submission) throw new NotFoundError('Session not found');
    if (submission.status !== 'draft') {
      throw new ValidationError('Session must be in draft status to confirm');
    }

    const fields = submission.fields ? [...submission.fields] : [];

    // Apply edits
    if (parsed.data.edits && parsed.data.edits.length > 0) {
      const version = storedVersions.find(
        (v) => v.schemaId === submission.schemaId && v.version === submission.schemaVersion,
      );
      const fieldDefMap = new Map((version?.fields ?? []).map((f) => [f.key, f]));

      for (const edit of parsed.data.edits) {
        const fieldDef = fieldDefMap.get(edit.key);
        if (!fieldDef) throw new ValidationError(`Unknown field key: ${edit.key}`);

        const fieldIndex = fields.findIndex((f) => f.key === edit.key);
        if (fieldIndex >= 0) {
          fields[fieldIndex].value = edit.value;
          fields[fieldIndex].status = 'user_edited';
        } else {
          fields.push({ key: edit.key, value: edit.value, status: 'user_edited' });
        }
      }
    }

    const confirmedAt = new Date().toISOString();
    submission.status = 'confirmed';
    submission.confirmedBy = 'customer';
    submission.confirmedAt = confirmedAt;
    submission.fields = fields;

    const version = storedVersions.find(
      (v) => v.schemaId === submission.schemaId && v.version === submission.schemaVersion,
    );
    const fieldDefMap = new Map((version?.fields ?? []).map((f) => [f.key, f]));

    const responseFields = fields.map((f) => {
      const def = fieldDefMap.get(f.key);
      return {
        key: f.key,
        label: def?.label ?? f.key,
        type: def?.type,
        value: f.value,
        status: f.status ?? 'unknown',
        confidence: f.confidence ?? 0,
        citations: (f.citations ?? []).map((cit) => ({
          url: cit.url ?? '',
          snippet: cit.snippet ?? '',
          pageTitle: cit.pageTitle ?? '',
          retrievedAt: cit.retrievedAt ?? '',
        })),
      };
    });

    return c.json({
      sessionId,
      fields: responseFields,
      confirmedAt,
    });
  });

  return { app, storedSubmissions, storedRuns, storedSchemas, storedVersions };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_SCHEMA_ID = '30000000-0000-0000-0000-000000000001';

function defaultSchemas(): StoredSchema[] {
  return [{ id: TEST_SCHEMA_ID, tenantId: 'tenant-1', name: 'Test Schema' }];
}

function defaultVersions(): StoredSchemaVersion[] {
  return [{
    schemaId: TEST_SCHEMA_ID,
    version: 1,
    fields: [
      { key: 'company_name', label: 'Company Name', type: 'string', required: true, instructions: 'Extract company name' },
      { key: 'industry', label: 'Industry', type: 'string', required: false, instructions: 'Extract industry' },
    ],
  }];
}

function postSession(app: Hono<TestEnv>, body: unknown) {
  return app.request('/public/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function getSession(app: Hono<TestEnv>, sessionId: string, token: string) {
  return app.request(`/public/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

function confirmSession(app: Hono<TestEnv>, sessionId: string, token: string, body: unknown) {
  return app.request(`/public/sessions/${sessionId}/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

// =====================
// POST /public/sessions
// =====================

describe('POST /public/sessions', () => {
  it('creates session → 201 with sessionId and token', async () => {
    const { app } = createPublicSessionsTestApp({
      schemas: defaultSchemas(),
      versions: defaultVersions(),
    });

    const res = await postSession(app, {
      schemaId: TEST_SCHEMA_ID,
      websiteUrl: 'https://example.com',
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.sessionId).toBeDefined();
    expect(body.sessionToken).toBeDefined();
    expect(body.config).toEqual({ reviewMode: 'blocking', reviewUrl: '' });
  });

  it('session token is verifiable', async () => {
    const { app } = createPublicSessionsTestApp({
      schemas: defaultSchemas(),
      versions: defaultVersions(),
    });

    const res = await postSession(app, {
      schemaId: TEST_SCHEMA_ID,
      websiteUrl: 'https://example.com',
    });

    const body = await res.json();
    const tokenData = await verifySessionToken(body.sessionToken);
    expect(tokenData.submissionId).toBe(body.sessionId);
    expect(tokenData.tenantId).toBe('tenant-1');
  });

  it('stores customer metadata', async () => {
    const { app, storedSubmissions } = createPublicSessionsTestApp({
      schemas: defaultSchemas(),
      versions: defaultVersions(),
    });

    await postSession(app, {
      schemaId: TEST_SCHEMA_ID,
      websiteUrl: 'https://example.com',
      customer: { email: 'test@example.com', name: 'Test User' },
      metadata: { referrer: 'google' },
    });

    expect(storedSubmissions).toHaveLength(1);
    const meta = storedSubmissions[0].customerMeta as Record<string, unknown>;
    expect(meta.customer).toEqual({ email: 'test@example.com', name: 'Test User' });
    expect(meta.metadata).toEqual({ referrer: 'google' });
  });

  it('resolves latest schema version when not specified', async () => {
    const versions: StoredSchemaVersion[] = [
      ...defaultVersions(),
      {
        schemaId: TEST_SCHEMA_ID,
        version: 2,
        fields: [{ key: 'v2_field', label: 'V2 Field', type: 'string', required: true, instructions: 'v2' }],
      },
    ];

    const { app, storedSubmissions } = createPublicSessionsTestApp({
      schemas: defaultSchemas(),
      versions,
    });

    await postSession(app, {
      schemaId: TEST_SCHEMA_ID,
      websiteUrl: 'https://example.com',
    });

    expect(storedSubmissions[0].schemaVersion).toBe(2);
  });

  it('uses specified schema version', async () => {
    const versions: StoredSchemaVersion[] = [
      ...defaultVersions(),
      {
        schemaId: TEST_SCHEMA_ID,
        version: 2,
        fields: [{ key: 'v2_field', label: 'V2 Field', type: 'string', required: true, instructions: 'v2' }],
      },
    ];

    const { app, storedSubmissions } = createPublicSessionsTestApp({
      schemas: defaultSchemas(),
      versions,
    });

    await postSession(app, {
      schemaId: TEST_SCHEMA_ID,
      schemaVersion: 1,
      websiteUrl: 'https://example.com',
    });

    expect(storedSubmissions[0].schemaVersion).toBe(1);
  });

  it('rejects invalid schema ID → 400', async () => {
    const { app } = createPublicSessionsTestApp({
      schemas: defaultSchemas(),
      versions: defaultVersions(),
    });

    const res = await postSession(app, {
      schemaId: 'not-a-uuid',
      websiteUrl: 'https://example.com',
    });

    expect(res.status).toBe(400);
  });

  it('rejects invalid URL → 400', async () => {
    const { app } = createPublicSessionsTestApp({
      schemas: defaultSchemas(),
      versions: defaultVersions(),
    });

    const res = await postSession(app, {
      schemaId: TEST_SCHEMA_ID,
      websiteUrl: 'not-a-url',
    });

    expect(res.status).toBe(400);
  });

  it('rejects nonexistent schema → 404', async () => {
    const { app } = createPublicSessionsTestApp({
      schemas: defaultSchemas(),
      versions: defaultVersions(),
    });

    const res = await postSession(app, {
      schemaId: '99999999-0000-0000-0000-000000000001',
      websiteUrl: 'https://example.com',
    });

    expect(res.status).toBe(404);
  });

  it('rejects nonexistent schema version → 404', async () => {
    const { app } = createPublicSessionsTestApp({
      schemas: defaultSchemas(),
      versions: defaultVersions(),
    });

    const res = await postSession(app, {
      schemaId: TEST_SCHEMA_ID,
      schemaVersion: 999,
      websiteUrl: 'https://example.com',
    });

    expect(res.status).toBe(404);
  });
});

// =====================
// GET /public/sessions/:id
// =====================

describe('GET /public/sessions/:id', () => {
  it('returns processing status for pending submission', async () => {
    const { app } = createPublicSessionsTestApp({
      schemas: defaultSchemas(),
      versions: defaultVersions(),
    });

    // Create session first
    const createRes = await postSession(app, {
      schemaId: TEST_SCHEMA_ID,
      websiteUrl: 'https://example.com',
    });
    const { sessionId, sessionToken } = await createRes.json();

    const res = await getSession(app, sessionId, sessionToken);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessionId).toBe(sessionId);
    expect(body.status).toBe('processing');
  });

  it('returns progress for running workflow', async () => {
    const submissionId = '10000000-0000-0000-0000-000000000001';
    const sessionToken = await signSessionToken(submissionId, 'tenant-1');

    const { app } = createPublicSessionsTestApp({
      schemas: defaultSchemas(),
      versions: defaultVersions(),
      submissions: [{
        id: submissionId,
        tenantId: 'tenant-1',
        schemaId: TEST_SCHEMA_ID,
        schemaVersion: 1,
        websiteUrl: 'https://example.com',
        status: 'pending',
        fields: null,
        customerMeta: null,
        confirmedBy: null,
        confirmedAt: null,
        editHistory: null,
      }],
      workflowRuns: [{
        id: '20000000-0000-0000-0000-000000000001',
        submissionId,
        status: 'running',
        steps: [
          { name: 'validate', status: 'completed', startedAt: '2025-01-01T00:00:00Z', completedAt: '2025-01-01T00:00:01Z', output: null, error: null, attempts: 1 },
          { name: 'crawl', status: 'running', startedAt: '2025-01-01T00:00:01Z', completedAt: null, output: { pageCount: 5 }, error: null, attempts: 1 },
        ],
      }],
    });

    const res = await getSession(app, submissionId, sessionToken);
    const body = await res.json();

    expect(body.status).toBe('processing');
    expect(body.progress).toBeDefined();
    expect(body.progress.stage).toBe('crawling');
    expect(body.progress.message).toBe('Crawling your website...');
    expect(body.progress.pagesFound).toBe(5);
  });

  it('returns draft fields for draft submission', async () => {
    const submissionId = '10000000-0000-0000-0000-000000000001';
    const sessionToken = await signSessionToken(submissionId, 'tenant-1');

    const { app } = createPublicSessionsTestApp({
      schemas: defaultSchemas(),
      versions: defaultVersions(),
      submissions: [{
        id: submissionId,
        tenantId: 'tenant-1',
        schemaId: TEST_SCHEMA_ID,
        schemaVersion: 1,
        websiteUrl: 'https://example.com',
        status: 'draft',
        fields: [
          {
            key: 'company_name',
            value: 'Acme Corp',
            confidence: 0.95,
            status: 'auto',
            citations: [{ url: 'https://example.com', snippet: 'Acme Corp', pageTitle: 'Home', retrievedAt: '2025-01-01T00:00:00Z' }],
          },
          {
            key: 'industry',
            value: null,
            confidence: 0,
            status: 'unknown',
          },
        ],
        customerMeta: null,
        confirmedBy: null,
        confirmedAt: null,
        editHistory: null,
      }],
    });

    const res = await getSession(app, submissionId, sessionToken);
    const body = await res.json();

    expect(body.status).toBe('draft');
    expect(body.draft).toBeDefined();
    expect(body.draft.fields).toHaveLength(2);

    const companyField = body.draft.fields[0];
    expect(companyField.key).toBe('company_name');
    expect(companyField.label).toBe('Company Name');
    expect(companyField.value).toBe('Acme Corp');
    expect(companyField.confidence).toBe(0.95);
    expect(companyField.status).toBe('auto');
    expect(companyField.citations).toHaveLength(1);

    const industryField = body.draft.fields[1];
    expect(industryField.key).toBe('industry');
    expect(industryField.value).toBeNull();
    expect(industryField.confidence).toBe(0);
    expect(industryField.status).toBe('unknown');
  });

  it('returns error for failed submission', async () => {
    const submissionId = '10000000-0000-0000-0000-000000000001';
    const sessionToken = await signSessionToken(submissionId, 'tenant-1');

    const { app } = createPublicSessionsTestApp({
      schemas: defaultSchemas(),
      versions: defaultVersions(),
      submissions: [{
        id: submissionId,
        tenantId: 'tenant-1',
        schemaId: TEST_SCHEMA_ID,
        schemaVersion: 1,
        websiteUrl: 'https://example.com',
        status: 'failed',
        fields: null,
        customerMeta: null,
        confirmedBy: null,
        confirmedAt: null,
        editHistory: null,
      }],
      workflowRuns: [{
        id: '20000000-0000-0000-0000-000000000001',
        submissionId,
        status: 'failed',
        steps: [
          { name: 'validate', status: 'completed', startedAt: '2025-01-01T00:00:00Z', completedAt: '2025-01-01T00:00:01Z', output: null, error: null, attempts: 1 },
          { name: 'crawl', status: 'failed', startedAt: '2025-01-01T00:00:01Z', completedAt: '2025-01-01T00:00:05Z', output: null, error: 'Connection timeout', attempts: 3 },
        ],
      }],
    });

    const res = await getSession(app, submissionId, sessionToken);
    const body = await res.json();

    expect(body.status).toBe('failed');
    expect(body.error).toBeDefined();
    expect(body.error.message).toBe('Connection timeout');
    expect(body.error.code).toBe('WORKFLOW_FAILED');
  });

  it('rejects missing Authorization header → 401', async () => {
    const { app } = createPublicSessionsTestApp({
      schemas: defaultSchemas(),
      versions: defaultVersions(),
    });

    const res = await app.request('/public/sessions/some-id');
    expect(res.status).toBe(401);
  });

  it('rejects token for different session → 401', async () => {
    const wrongToken = await signSessionToken('different-session-id', 'tenant-1');

    const { app } = createPublicSessionsTestApp({
      schemas: defaultSchemas(),
      versions: defaultVersions(),
      submissions: [{
        id: '10000000-0000-0000-0000-000000000001',
        tenantId: 'tenant-1',
        schemaId: TEST_SCHEMA_ID,
        schemaVersion: 1,
        websiteUrl: 'https://example.com',
        status: 'pending',
        fields: null,
        customerMeta: null,
        confirmedBy: null,
        confirmedAt: null,
        editHistory: null,
      }],
    });

    const res = await getSession(app, '10000000-0000-0000-0000-000000000001', wrongToken);
    expect(res.status).toBe(401);
  });

  it('returns 404 for nonexistent session', async () => {
    const sessionId = '10000000-0000-0000-0000-999999999999';
    const sessionToken = await signSessionToken(sessionId, 'tenant-1');

    const { app } = createPublicSessionsTestApp({
      schemas: defaultSchemas(),
      versions: defaultVersions(),
    });

    const res = await getSession(app, sessionId, sessionToken);
    expect(res.status).toBe(404);
  });
});

// =====================
// POST /public/sessions/:id/confirm
// =====================

describe('POST /public/sessions/:id/confirm', () => {
  it('confirms draft session → 200', async () => {
    const submissionId = '10000000-0000-0000-0000-000000000001';
    const sessionToken = await signSessionToken(submissionId, 'tenant-1');

    const { app, storedSubmissions } = createPublicSessionsTestApp({
      schemas: defaultSchemas(),
      versions: defaultVersions(),
      submissions: [{
        id: submissionId,
        tenantId: 'tenant-1',
        schemaId: TEST_SCHEMA_ID,
        schemaVersion: 1,
        websiteUrl: 'https://example.com',
        status: 'draft',
        fields: [
          { key: 'company_name', value: 'Acme Corp', confidence: 0.95, status: 'auto' },
        ],
        customerMeta: null,
        confirmedBy: null,
        confirmedAt: null,
        editHistory: null,
      }],
    });

    const res = await confirmSession(app, submissionId, sessionToken, {});
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.sessionId).toBe(submissionId);
    expect(body.confirmedAt).toBeDefined();
    expect(body.fields).toHaveLength(1);
    expect(body.fields[0].key).toBe('company_name');

    // Verify in-memory state updated
    expect(storedSubmissions[0].status).toBe('confirmed');
    expect(storedSubmissions[0].confirmedBy).toBe('customer');
  });

  it('applies edits during confirmation', async () => {
    const submissionId = '10000000-0000-0000-0000-000000000001';
    const sessionToken = await signSessionToken(submissionId, 'tenant-1');

    const { app } = createPublicSessionsTestApp({
      schemas: defaultSchemas(),
      versions: defaultVersions(),
      submissions: [{
        id: submissionId,
        tenantId: 'tenant-1',
        schemaId: TEST_SCHEMA_ID,
        schemaVersion: 1,
        websiteUrl: 'https://example.com',
        status: 'draft',
        fields: [
          { key: 'company_name', value: 'Acme Corp', confidence: 0.95, status: 'auto' },
          { key: 'industry', value: null, confidence: 0, status: 'unknown' },
        ],
        customerMeta: null,
        confirmedBy: null,
        confirmedAt: null,
        editHistory: null,
      }],
    });

    const res = await confirmSession(app, submissionId, sessionToken, {
      edits: [
        { key: 'company_name', value: 'Acme Corporation' },
        { key: 'industry', value: 'Technology' },
      ],
    });

    expect(res.status).toBe(200);
    const body = await res.json();

    const companyField = body.fields.find((f: { key: string }) => f.key === 'company_name');
    expect(companyField.value).toBe('Acme Corporation');
    expect(companyField.status).toBe('user_edited');

    const industryField = body.fields.find((f: { key: string }) => f.key === 'industry');
    expect(industryField.value).toBe('Technology');
    expect(industryField.status).toBe('user_edited');
  });

  it('rejects unknown field key in edits → 400', async () => {
    const submissionId = '10000000-0000-0000-0000-000000000001';
    const sessionToken = await signSessionToken(submissionId, 'tenant-1');

    const { app } = createPublicSessionsTestApp({
      schemas: defaultSchemas(),
      versions: defaultVersions(),
      submissions: [{
        id: submissionId,
        tenantId: 'tenant-1',
        schemaId: TEST_SCHEMA_ID,
        schemaVersion: 1,
        websiteUrl: 'https://example.com',
        status: 'draft',
        fields: [{ key: 'company_name', value: 'Acme', confidence: 0.95, status: 'auto' }],
        customerMeta: null,
        confirmedBy: null,
        confirmedAt: null,
        editHistory: null,
      }],
    });

    const res = await confirmSession(app, submissionId, sessionToken, {
      edits: [{ key: 'nonexistent_field', value: 'test' }],
    });

    expect(res.status).toBe(400);
  });

  it('rejects non-draft submission → 400', async () => {
    const submissionId = '10000000-0000-0000-0000-000000000001';
    const sessionToken = await signSessionToken(submissionId, 'tenant-1');

    const { app } = createPublicSessionsTestApp({
      schemas: defaultSchemas(),
      versions: defaultVersions(),
      submissions: [{
        id: submissionId,
        tenantId: 'tenant-1',
        schemaId: TEST_SCHEMA_ID,
        schemaVersion: 1,
        websiteUrl: 'https://example.com',
        status: 'pending',
        fields: null,
        customerMeta: null,
        confirmedBy: null,
        confirmedAt: null,
        editHistory: null,
      }],
    });

    const res = await confirmSession(app, submissionId, sessionToken, {});
    expect(res.status).toBe(400);
  });

  it('rejects missing Authorization header → 401', async () => {
    const { app } = createPublicSessionsTestApp({
      schemas: defaultSchemas(),
      versions: defaultVersions(),
    });

    const res = await app.request('/public/sessions/some-id/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(401);
  });

  it('rejects token for different session → 401', async () => {
    const wrongToken = await signSessionToken('different-id', 'tenant-1');

    const { app } = createPublicSessionsTestApp({
      schemas: defaultSchemas(),
      versions: defaultVersions(),
      submissions: [{
        id: '10000000-0000-0000-0000-000000000001',
        tenantId: 'tenant-1',
        schemaId: TEST_SCHEMA_ID,
        schemaVersion: 1,
        websiteUrl: 'https://example.com',
        status: 'draft',
        fields: [],
        customerMeta: null,
        confirmedBy: null,
        confirmedAt: null,
        editHistory: null,
      }],
    });

    const res = await confirmSession(app, '10000000-0000-0000-0000-000000000001', wrongToken, {});
    expect(res.status).toBe(401);
  });
});
