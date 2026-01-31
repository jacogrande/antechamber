import type { Database } from '../../db/client';
import type { StorageClient } from '../storage';
import type { LlmClient } from '../extraction/types';
import type { FetchFn } from '../crawl/types';

// ---------------------------------------------------------------------------
// Status unions
// ---------------------------------------------------------------------------

export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed';

// ---------------------------------------------------------------------------
// Step record (persisted in workflow_runs.steps JSONB)
// ---------------------------------------------------------------------------

export interface StepRecord {
  name: string;
  status: StepStatus;
  startedAt: string | null;
  completedAt: string | null;
  output: unknown;
  error: string | null;
  attempts: number;
}

// ---------------------------------------------------------------------------
// Retry policy
// ---------------------------------------------------------------------------

export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  timeoutMs: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  timeoutMs: 120000,
};

// ---------------------------------------------------------------------------
// Step definition
// ---------------------------------------------------------------------------

export interface StepDefinition<TOutput = unknown> {
  name: string;
  retryPolicy?: Partial<RetryPolicy>;
  run: (ctx: WorkflowContext) => Promise<TOutput>;
}

// ---------------------------------------------------------------------------
// Workflow definition
// ---------------------------------------------------------------------------

export interface WorkflowDefinition {
  name: string;
  steps: StepDefinition[];
}

// ---------------------------------------------------------------------------
// Dependencies & context
// ---------------------------------------------------------------------------

export interface WorkflowDeps {
  db: Database;
  storage: StorageClient;
  llmClient: LlmClient;
  fetchFn?: FetchFn;
}

export interface WorkflowContext extends WorkflowDeps {
  runId: string;
  submissionId: string;
  getStepOutput: <T = unknown>(stepName: string) => T;
  log: (message: string) => void;
}
