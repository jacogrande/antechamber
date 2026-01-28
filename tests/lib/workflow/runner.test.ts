import { describe, it, expect } from 'bun:test';
import { WorkflowRunner, isRetryable, sleep } from '../../../src/lib/workflow/runner';
import { AppError, NotFoundError, ValidationError } from '../../../src/lib/errors';
import type {
  WorkflowDeps,
  WorkflowDefinition,
  StepDefinition,
  StepRecord,
  WorkflowContext,
} from '../../../src/lib/workflow/types';

// ---------------------------------------------------------------------------
// Stub database
// ---------------------------------------------------------------------------

interface WorkflowRunRow {
  id: string;
  status: string;
  steps: StepRecord[];
  error: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  updatedAt: Date | null;
}

function createStubDb(initialRun?: Partial<WorkflowRunRow>) {
  const runs = new Map<string, WorkflowRunRow>();
  if (initialRun?.id) {
    runs.set(initialRun.id, {
      id: initialRun.id,
      status: initialRun.status ?? 'pending',
      steps: initialRun.steps ?? [],
      error: initialRun.error ?? null,
      startedAt: initialRun.startedAt ?? null,
      completedAt: initialRun.completedAt ?? null,
      updatedAt: null,
    });
  }

  // Minimal mock of drizzle query builder
  const db = {
    update: (table: any) => ({
      set: (values: any) => ({
        where: (condition: any) => {
          // Extract the run ID from the condition (we just use the first run)
          const runId = Array.from(runs.keys())[0];
          if (runId && runs.has(runId)) {
            const row = runs.get(runId)!;
            if (values.status !== undefined) row.status = values.status;
            if (values.steps !== undefined) row.steps = values.steps;
            if (values.error !== undefined) row.error = values.error;
            if (values.startedAt !== undefined) row.startedAt = values.startedAt;
            if (values.completedAt !== undefined) row.completedAt = values.completedAt;
            if (values.updatedAt !== undefined) row.updatedAt = values.updatedAt;
          }
          return Promise.resolve();
        },
      }),
    }),
    select: (fields?: any) => ({
      from: (table: any) => ({
        where: (condition: any) => {
          const runId = Array.from(runs.keys())[0];
          if (runId && runs.has(runId)) {
            return Promise.resolve([runs.get(runId)!]);
          }
          return Promise.resolve([]);
        },
      }),
    }),
    _runs: runs,
  } as any;

  return db;
}

function createStubDeps(db: any): WorkflowDeps {
  return {
    db,
    storage: {
      put: async () => {},
      get: async () => null,
      delete: async () => {},
      exists: async () => false,
      getSignedUrl: async (key: string) => `https://stub-storage.local/${key}`,
    },
    llmClient: {
      chat: async () => '',
      chatWithTools: async () => ({ toolName: '', input: {} }),
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('isRetryable', () => {
  it('returns false for AppError with statusCode < 500', () => {
    expect(isRetryable(new ValidationError('bad input'))).toBe(false);
    expect(isRetryable(new NotFoundError('not found'))).toBe(false);
    expect(isRetryable(new AppError('CLIENT', 'client error', 400))).toBe(false);
  });

  it('returns true for AppError with statusCode >= 500', () => {
    expect(isRetryable(new AppError('SERVER', 'server error', 500))).toBe(true);
    expect(isRetryable(new AppError('SERVER', 'server error', 502))).toBe(true);
  });

  it('returns true for generic errors', () => {
    expect(isRetryable(new Error('network failure'))).toBe(true);
    expect(isRetryable('string error')).toBe(true);
  });
});

describe('WorkflowRunner', () => {
  const RUN_ID = 'run-1';

  function makeWorkflow(steps: StepDefinition[]): WorkflowDefinition {
    return { name: 'test_workflow', steps };
  }

  it('executes steps in order', async () => {
    const executionOrder: string[] = [];
    const db = createStubDb({ id: RUN_ID, steps: [] });
    const deps = createStubDeps(db);
    const runner = new WorkflowRunner(deps);

    const workflow = makeWorkflow([
      {
        name: 'step_a',
        retryPolicy: { maxAttempts: 1, timeoutMs: 5000 },
        run: async () => {
          executionOrder.push('a');
          return { value: 'A' };
        },
      },
      {
        name: 'step_b',
        retryPolicy: { maxAttempts: 1, timeoutMs: 5000 },
        run: async () => {
          executionOrder.push('b');
          return { value: 'B' };
        },
      },
    ]);

    await runner.execute(workflow, 'sub-1', RUN_ID);

    expect(executionOrder).toEqual(['a', 'b']);
  });

  it('updates workflow run status to completed on success', async () => {
    const db = createStubDb({ id: RUN_ID, steps: [] });
    const deps = createStubDeps(db);
    const runner = new WorkflowRunner(deps);

    const workflow = makeWorkflow([
      {
        name: 'step_a',
        retryPolicy: { maxAttempts: 1, timeoutMs: 5000 },
        run: async () => 'ok',
      },
    ]);

    await runner.execute(workflow, 'sub-1', RUN_ID);

    const run = db._runs.get(RUN_ID)!;
    expect(run.status).toBe('completed');
    expect(run.completedAt).toBeTruthy();
  });

  it('skips already-completed steps on re-run (idempotency)', async () => {
    let stepACalls = 0;
    const completedStep: StepRecord = {
      name: 'step_a',
      status: 'completed',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      output: { fromPreviousRun: true },
      error: null,
      attempts: 1,
    };
    const db = createStubDb({ id: RUN_ID, steps: [completedStep] });
    const deps = createStubDeps(db);
    const runner = new WorkflowRunner(deps);

    const workflow = makeWorkflow([
      {
        name: 'step_a',
        retryPolicy: { maxAttempts: 1, timeoutMs: 5000 },
        run: async () => {
          stepACalls++;
          return 'should not run';
        },
      },
      {
        name: 'step_b',
        retryPolicy: { maxAttempts: 1, timeoutMs: 5000 },
        run: async (ctx) => {
          const prev = ctx.getStepOutput<{ fromPreviousRun: boolean }>('step_a');
          return { gotPrevious: prev.fromPreviousRun };
        },
      },
    ]);

    await runner.execute(workflow, 'sub-1', RUN_ID);

    expect(stepACalls).toBe(0);
    const run = db._runs.get(RUN_ID)!;
    expect(run.status).toBe('completed');
    // step_b should have access to step_a's cached output
    const stepB = run.steps.find((s: StepRecord) => s.name === 'step_b');
    expect(stepB?.status).toBe('completed');
    expect((stepB?.output as any)?.gotPrevious).toBe(true);
  });

  it('retries transient failures up to maxAttempts', async () => {
    let attempts = 0;
    const db = createStubDb({ id: RUN_ID, steps: [] });
    const deps = createStubDeps(db);
    const runner = new WorkflowRunner(deps);

    const workflow = makeWorkflow([
      {
        name: 'flaky_step',
        retryPolicy: { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 10, timeoutMs: 5000 },
        run: async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error('transient failure');
          }
          return 'success';
        },
      },
    ]);

    await runner.execute(workflow, 'sub-1', RUN_ID);

    expect(attempts).toBe(3);
    const run = db._runs.get(RUN_ID)!;
    expect(run.status).toBe('completed');
    const step = run.steps.find((s: StepRecord) => s.name === 'flaky_step');
    expect(step?.attempts).toBe(3);
  });

  it('does NOT retry AppError with statusCode < 500', async () => {
    let attempts = 0;
    const db = createStubDb({ id: RUN_ID, steps: [] });
    const deps = createStubDeps(db);
    const runner = new WorkflowRunner(deps);

    const workflow = makeWorkflow([
      {
        name: 'non_retryable',
        retryPolicy: { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 10, timeoutMs: 5000 },
        run: async () => {
          attempts++;
          throw new ValidationError('bad input');
        },
      },
    ]);

    await expect(runner.execute(workflow, 'sub-1', RUN_ID)).rejects.toThrow('bad input');
    expect(attempts).toBe(1);

    const run = db._runs.get(RUN_ID)!;
    expect(run.status).toBe('failed');
  });

  it('times out long-running steps', async () => {
    const db = createStubDb({ id: RUN_ID, steps: [] });
    const deps = createStubDeps(db);
    const runner = new WorkflowRunner(deps);

    const workflow = makeWorkflow([
      {
        name: 'slow_step',
        retryPolicy: { maxAttempts: 1, timeoutMs: 50 },
        run: async () => {
          await sleep(500);
          return 'should not complete';
        },
      },
    ]);

    await expect(runner.execute(workflow, 'sub-1', RUN_ID)).rejects.toThrow(
      'timed out',
    );

    const run = db._runs.get(RUN_ID)!;
    expect(run.status).toBe('failed');
  });

  it('marks run as failed on terminal error', async () => {
    const db = createStubDb({ id: RUN_ID, steps: [] });
    const deps = createStubDeps(db);
    const runner = new WorkflowRunner(deps);

    const workflow = makeWorkflow([
      {
        name: 'ok_step',
        retryPolicy: { maxAttempts: 1, timeoutMs: 5000 },
        run: async () => 'ok',
      },
      {
        name: 'fail_step',
        retryPolicy: { maxAttempts: 1, timeoutMs: 5000 },
        run: async () => {
          throw new Error('fatal error');
        },
      },
    ]);

    await expect(runner.execute(workflow, 'sub-1', RUN_ID)).rejects.toThrow('fatal error');

    const run = db._runs.get(RUN_ID)!;
    expect(run.status).toBe('failed');
    expect(run.error).toBe('fatal error');
  });

  it('records step attempts count', async () => {
    let attempts = 0;
    const db = createStubDb({ id: RUN_ID, steps: [] });
    const deps = createStubDeps(db);
    const runner = new WorkflowRunner(deps);

    const workflow = makeWorkflow([
      {
        name: 'retry_step',
        retryPolicy: { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 10, timeoutMs: 5000 },
        run: async () => {
          attempts++;
          if (attempts < 2) {
            throw new Error('transient');
          }
          return 'ok';
        },
      },
    ]);

    await runner.execute(workflow, 'sub-1', RUN_ID);

    const run = db._runs.get(RUN_ID)!;
    const step = run.steps.find((s: StepRecord) => s.name === 'retry_step');
    expect(step?.attempts).toBe(2);
    expect(step?.status).toBe('completed');
  });
});
