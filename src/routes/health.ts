import { Hono } from 'hono';
import { checkDbConnection } from '../db/client';

const health = new Hono();

health.get('/health', async (c) => {
  const dbOk = await checkDbConnection();
  const status = dbOk ? 'ok' : 'degraded';
  return c.json(
    { status, db: dbOk ? 'ok' : 'error', timestamp: new Date().toISOString() },
    dbOk ? 200 : 503,
  );
});

export default health;
