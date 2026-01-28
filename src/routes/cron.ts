import { Hono } from 'hono';
import { getDb } from '../db/client';
import { WebhookDeliveryService } from '../lib/webhooks';

/**
 * Cron routes for scheduled background jobs.
 * These endpoints are called by external schedulers (Vercel Cron, etc.)
 * and are protected by a shared secret.
 */

export function createCronRoute(depsOverride?: { db?: ReturnType<typeof getDb> }) {
  const route = new Hono();

  // Verify cron secret middleware
  // Note: Read CRON_SECRET at request time to support testing
  route.use('*', async (c, next) => {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = c.req.header('Authorization');

    if (!cronSecret) {
      console.warn('[cron] CRON_SECRET not configured, rejecting request');
      return c.json({ error: 'Cron not configured' }, 503);
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    return next();
  });

  /**
   * POST /api/cron/webhooks
   * Process pending webhook deliveries.
   * Should be called every minute by a scheduler.
   */
  route.post('/api/cron/webhooks', async (c) => {
    const db = depsOverride?.db ?? getDb();
    const deliveryService = new WebhookDeliveryService(db, fetch);

    const batchSize = 100;
    const processed = await deliveryService.processPendingDeliveries(batchSize);

    return c.json({
      processed,
      timestamp: new Date().toISOString(),
    });
  });

  return route;
}

const cronRoute = createCronRoute();
export default cronRoute;
