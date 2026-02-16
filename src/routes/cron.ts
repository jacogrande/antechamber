import crypto from 'crypto';
import { Hono } from 'hono';
import { checkDbConnection } from '../db/client';
import { createLogger } from '../lib/logger';

const log = createLogger('cron');

const cron = new Hono();

cron.get('/api/cron/health-check', async (c) => {
  const authHeader = c.req.header('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || !authHeader) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or missing cron secret' } }, 401);
  }

  const provided = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const isValid =
    provided.length === cronSecret.length &&
    crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(cronSecret));

  if (!isValid) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or missing cron secret' } }, 401);
  }

  const dbOk = await checkDbConnection();
  if (!dbOk) {
    log.error('Cron health check: database unreachable');
  }

  const status = dbOk ? 'ok' : 'degraded';
  return c.json(
    { status, db: dbOk ? 'ok' : 'error', timestamp: new Date().toISOString() },
    dbOk ? 200 : 503,
  );
});

export default cron;
