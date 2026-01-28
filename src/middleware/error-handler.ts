import type { ErrorHandler } from 'hono';
import { AppError } from '../lib/errors';

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

  console.error('Unhandled error:', err);

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
