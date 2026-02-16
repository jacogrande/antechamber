import type { ErrorHandler } from 'hono';
import { AppError } from '../lib/errors';
import { createLogger } from '../lib/logger';
import { captureException } from '../lib/sentry';

const log = createLogger('error-handler');

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof AppError) {
    return c.json(
      {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details !== undefined && { details: err.details }),
        },
      },
      err.statusCode as Parameters<typeof c.json>[1],
    );
  }

  const requestId = c.get('requestId') as string | undefined;
  log.error('Unhandled error', { method: c.req.method, path: c.req.path, requestId, error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined });
  captureException(err, { method: c.req.method, path: c.req.path, requestId });

  return c.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    },
    500,
  );
};
