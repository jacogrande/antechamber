import { Hono } from 'hono';
import { checkDbConnection } from '../db/client';

export interface HealthRouteDeps {
  checkDb?: () => Promise<boolean>;
  now?: () => Date;
}

export function createHealthRoute(deps?: HealthRouteDeps): Hono {
  const health = new Hono();
  const checkDb = deps?.checkDb ?? checkDbConnection;
  const now = deps?.now ?? (() => new Date());

  health.get('/health', async (c) => {
    const dbOk = await checkDb();
    const status = dbOk ? 'ok' : 'degraded';
    return c.json(
      { status, db: dbOk ? 'ok' : 'error', timestamp: now().toISOString() },
      dbOk ? 200 : 503,
    );
  });

  return health;
}

const health = createHealthRoute();
export default health;
