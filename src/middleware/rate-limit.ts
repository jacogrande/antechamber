import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../types/app';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  keyGenerator: (c: { req: { header: (name: string) => string | undefined }; get: (key: string) => string | undefined }) => string;
  message?: string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup of expired entries to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}, 60_000);

export function rateLimit(config: RateLimitConfig) {
  const { windowMs, max, keyGenerator, message } = config;

  return createMiddleware<AppEnv>(async (c, next) => {
    const key = keyGenerator(c);
    const now = Date.now();
    const entry = store.get(key);

    if (entry && now < entry.resetAt) {
      if (entry.count >= max) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        c.header('Retry-After', String(retryAfter));
        return c.json(
          {
            error: {
              code: 'RATE_LIMITED',
              message: message ?? 'Too many requests, please try again later',
            },
          },
          429,
        );
      }
      entry.count++;
    } else {
      store.set(key, { count: 1, resetAt: now + windowMs });
    }

    await next();
  });
}

function getClientIp(c: { req: { header: (name: string) => string | undefined } }): string {
  return c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    ?? c.req.header('x-real-ip')
    ?? 'unknown';
}

export function ipRateLimit(max: number, windowMs: number) {
  return rateLimit({
    windowMs,
    max,
    keyGenerator: (c) => `ip:${getClientIp(c)}`,
  });
}

export function tenantRateLimit(max: number, windowMs: number) {
  return rateLimit({
    windowMs,
    max,
    keyGenerator: (c) => `tenant:${c.get('tenantId') ?? 'unknown'}`,
  });
}
