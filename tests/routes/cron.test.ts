import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Hono } from 'hono';
import { createCronRoute } from '../../src/routes/cron';

describe('cron routes', () => {
  const ORIGINAL_ENV = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = 'test-cron-secret';
  });

  afterEach(() => {
    if (ORIGINAL_ENV !== undefined) {
      process.env.CRON_SECRET = ORIGINAL_ENV;
    } else {
      delete process.env.CRON_SECRET;
    }
  });

  function createMockDb() {
    const pendingDeliveries: Array<{
      id: string;
      webhookId: string;
      submissionId: string;
      payload: unknown;
      attempts: number;
      endpointUrl: string;
      secret: string;
      isActive: boolean;
    }> = [];

    return {
      pendingDeliveries,
      select: () => ({
        from: () => ({
          innerJoin: () => ({
            where: () => Promise.resolve(pendingDeliveries),
          }),
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      }),
      update: () => ({
        set: () => ({
          where: () => Promise.resolve(),
        }),
      }),
    };
  }

  describe('POST /api/cron/webhooks', () => {
    it('returns 401 without auth header', async () => {
      const mockDb = createMockDb();
      const app = new Hono();
      app.route('/', createCronRoute({ db: mockDb as any }));

      const res = await app.request('/api/cron/webhooks', {
        method: 'POST',
      });

      expect(res.status).toBe(401);
    });

    it('returns 401 with wrong secret', async () => {
      const mockDb = createMockDb();
      const app = new Hono();
      app.route('/', createCronRoute({ db: mockDb as any }));

      const res = await app.request('/api/cron/webhooks', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer wrong-secret',
        },
      });

      expect(res.status).toBe(401);
    });

    it('processes deliveries with valid secret', async () => {
      const mockDb = createMockDb();
      const app = new Hono();
      app.route('/', createCronRoute({ db: mockDb as any }));

      const res = await app.request('/api/cron/webhooks', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-cron-secret',
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.processed).toBe(0);
      expect(body.timestamp).toBeDefined();
    });

    it('returns 503 when CRON_SECRET not configured', async () => {
      delete process.env.CRON_SECRET;

      const mockDb = createMockDb();
      const app = new Hono();
      app.route('/', createCronRoute({ db: mockDb as any }));

      const res = await app.request('/api/cron/webhooks', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer some-secret',
        },
      });

      expect(res.status).toBe(503);
    });
  });
});
