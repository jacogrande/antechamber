import * as Sentry from '@sentry/node';

let initialized = false;

/**
 * Initialize Sentry error tracking. No-op when SENTRY_DSN is not set.
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.1,
  });
  initialized = true;
}

/**
 * Capture an exception in Sentry with optional context.
 * No-op if Sentry is not initialized.
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!initialized) return;

  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureException(error);
  });
}
