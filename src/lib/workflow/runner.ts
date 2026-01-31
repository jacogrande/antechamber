import { eq } from 'drizzle-orm';
import { workflowRuns } from '../../db/schema';
import { AppError } from '../errors';
import type {
  WorkflowDeps,
  WorkflowDefinition,
  WorkflowContext,
  StepDefinition,
  RetryPolicy,
} from './types';
import { DEFAULT_RETRY_POLICY } from './types';
import { parseStepRecords, type StepRecord } from '../validation';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isRetryable(err: unknown): boolean {
  if (err instanceof AppError && err.statusCode < 500) {
    return false;
  }
  return true;
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  stepName: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Step "${stepName}" timed out after ${ms}ms`)),
      ms,
    );
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeDelay(attempt: number, policy: RetryPolicy): number {
  const delay = Math.min(
    policy.baseDelayMs * 2 ** (attempt - 1),
    policy.maxDelayMs,
  );
  return delay;
}

// ---------------------------------------------------------------------------
// WorkflowRunner
// ---------------------------------------------------------------------------

export class WorkflowRunner {
  constructor(private readonly deps: WorkflowDeps) {}

  async execute(
    workflow: WorkflowDefinition,
    submissionId: string,
    runId: string,
  ): Promise<void> {
    const { db } = this.deps;
    const stepOutputs = new Map<string, unknown>();

    console.log(`[workflow:${workflow.name}] Starting execution for submission ${submissionId}`);
    console.log(`[workflow:${workflow.name}] Steps: ${workflow.steps.map(s => s.name).join(' → ')}`);

    // Mark run as running
    await db
      .update(workflowRuns)
      .set({ status: 'running', startedAt: new Date(), updatedAt: new Date() })
      .where(eq(workflowRuns.id, runId));

    // Load existing step records (for idempotency on re-run)
    const [run] = await db
      .select({ steps: workflowRuns.steps })
      .from(workflowRuns)
      .where(eq(workflowRuns.id, runId));

    const stepRecords: StepRecord[] = parseStepRecords(run?.steps);

    const ctx: WorkflowContext = {
      ...this.deps,
      runId,
      submissionId,
      getStepOutput<T = unknown>(stepName: string): T {
        if (!stepOutputs.has(stepName)) {
          throw new Error(`Step output "${stepName}" not available`);
        }
        return stepOutputs.get(stepName) as T;
      },
      log: (message: string) => {
        console.log(`[workflow:${workflow.name}:${runId}] ${message}`);
      },
    };

    try {
      for (const step of workflow.steps) {
        await this.executeStep(step, ctx, stepRecords, stepOutputs, runId);
      }

      // All steps completed — mark run as completed
      console.log(`[workflow:${workflow.name}] All steps completed successfully for submission ${submissionId}`);
      await db
        .update(workflowRuns)
        .set({
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
          steps: stepRecords,
        })
        .where(eq(workflowRuns.id, runId));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : String(err);
      console.error(`[workflow:${workflow.name}] Failed for submission ${submissionId}:`, errorMessage);
      await db
        .update(workflowRuns)
        .set({
          status: 'failed',
          error: errorMessage,
          updatedAt: new Date(),
          steps: stepRecords,
        })
        .where(eq(workflowRuns.id, runId));
      throw err;
    }
  }

  private async executeStep(
    step: StepDefinition,
    ctx: WorkflowContext,
    stepRecords: StepRecord[],
    stepOutputs: Map<string, unknown>,
    runId: string,
  ): Promise<void> {
    const { db } = this.deps;
    const policy: RetryPolicy = {
      ...DEFAULT_RETRY_POLICY,
      ...step.retryPolicy,
    };

    // Check for existing completed step (idempotency)
    const existing = stepRecords.find((r) => r.name === step.name);
    if (existing?.status === 'completed') {
      ctx.log(`Skipping already-completed step "${step.name}"`);
      stepOutputs.set(step.name, existing.output);
      return;
    }

    // Initialize or reset step record
    let record: StepRecord;
    const existingIndex = stepRecords.findIndex((r) => r.name === step.name);
    if (existingIndex >= 0) {
      record = stepRecords[existingIndex];
      record.status = 'running';
      record.startedAt = new Date().toISOString();
      record.error = null;
    } else {
      record = {
        name: step.name,
        status: 'running',
        startedAt: new Date().toISOString(),
        completedAt: null,
        output: null,
        error: null,
        attempts: 0,
      };
      stepRecords.push(record);
    }

    // Persist running status
    await db
      .update(workflowRuns)
      .set({ steps: stepRecords, updatedAt: new Date() })
      .where(eq(workflowRuns.id, runId));

    // Retry loop
    let lastError: unknown;
    for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
      record.attempts = attempt;
      ctx.log(`Step "${step.name}" starting (attempt ${attempt}/${policy.maxAttempts}, timeout: ${policy.timeoutMs}ms)`);
      const stepStartTime = Date.now();
      try {
        const output = await withTimeout(
          step.run(ctx),
          policy.timeoutMs,
          step.name,
        );

        const elapsed = Date.now() - stepStartTime;
        ctx.log(`Step "${step.name}" completed in ${elapsed}ms`);

        // Success
        record.status = 'completed';
        record.completedAt = new Date().toISOString();
        record.output = output;
        record.error = null;

        await db
          .update(workflowRuns)
          .set({ steps: stepRecords, updatedAt: new Date() })
          .where(eq(workflowRuns.id, runId));

        stepOutputs.set(step.name, output);
        return;
      } catch (err) {
        lastError = err;
        const errMsg = err instanceof Error ? err.message : String(err);

        if (!isRetryable(err) || attempt >= policy.maxAttempts) {
          // Terminal failure
          record.status = 'failed';
          record.error = errMsg;

          await db
            .update(workflowRuns)
            .set({ steps: stepRecords, updatedAt: new Date() })
            .where(eq(workflowRuns.id, runId));

          throw err;
        }

        // Transient failure — backoff and retry
        ctx.log(
          `Step "${step.name}" attempt ${attempt} failed: ${errMsg}. Retrying...`,
        );
        await sleep(computeDelay(attempt, policy));
      }
    }

    // Should not reach here, but guard just in case
    throw lastError;
  }
}
