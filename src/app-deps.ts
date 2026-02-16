import { getDb } from './db/client';
import { getEnv } from './env';
import { StubStorageClient, VercelBlobStorageClient } from './lib/storage';
import { createAnthropicClient } from './lib/extraction';
import type { WorkflowDeps } from './lib/workflow/types';
import { createLogger } from './lib/logger';

const log = createLogger('app-deps');

/**
 * Get workflow dependencies from environment configuration.
 * Returns null if required dependencies (ANTHROPIC_API_KEY) are not configured.
 * Uses StubStorageClient if BLOB_READ_WRITE_TOKEN is not set.
 */
export function getWorkflowDeps(): WorkflowDeps | null {
  const env = getEnv();

  log.debug('Checking workflow dependencies...');

  if (!env.ANTHROPIC_API_KEY) {
    log.warn('ANTHROPIC_API_KEY not configured — workflow execution disabled');
    return null;
  }

  const llmClient = createAnthropicClient(env.ANTHROPIC_API_KEY);

  const storage = env.BLOB_READ_WRITE_TOKEN
    ? new VercelBlobStorageClient(env.BLOB_READ_WRITE_TOKEN)
    : new StubStorageClient();

  if (!env.BLOB_READ_WRITE_TOKEN) {
    log.warn('BLOB_READ_WRITE_TOKEN not configured — using in-memory stub storage');
  }

  log.info('Workflow dependencies initialized successfully');
  return {
    db: getDb(),
    storage,
    llmClient,
  };
}
