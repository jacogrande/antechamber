import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../types/app';

export const requestIdMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const requestId = crypto.randomUUID();
  c.set('requestId', requestId);
  c.header('X-Request-ID', requestId);
  await next();
};
