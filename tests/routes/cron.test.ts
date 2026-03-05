import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import app from '../../src/index';
import { createCronRoute } from '../../src/routes/cron';

const CRON_SECRET = 'test-cron-secret-value';
const now = () => new Date('2026-01-01T00:00:00.000Z');

beforeAll(() => {
  process.env.CRON_SECRET = CRON_SECRET;
});

afterAll(() => {
  delete process.env.CRON_SECRET;
});

describe('GET /api/cron/health-check', () => {
  const route = createCronRoute({ checkDb: async () => true, now });

  it('returns 401 when Authorization header is missing', async () => {
    const res = await route.request('/api/cron/health-check');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when secret does not match', async () => {
    const res = await route.request('/api/cron/health-check', {
      headers: { Authorization: 'Bearer wrong-secret' },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when Authorization header has no Bearer prefix', async () => {
    const res = await route.request('/api/cron/health-check', {
      headers: { Authorization: CRON_SECRET },
    });
    expect(res.status).toBe(401);
  });

  it('returns 200 with ok status when db is healthy and secret is valid', async () => {
    const res = await route.request('/api/cron/health-check', {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.db).toBe('ok');
    expect(body.timestamp).toBe('2026-01-01T00:00:00.000Z');
  });

  it('returns 503 when db is unhealthy', async () => {
    const unhealthyRoute = createCronRoute({ checkDb: async () => false, now });
    const res = await unhealthyRoute.request('/api/cron/health-check', {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe('degraded');
    expect(body.db).toBe('error');
    expect(body.timestamp).toBe('2026-01-01T00:00:00.000Z');
  });

  it('does not require JWT auth (bypasses auth middleware)', async () => {
    // This verifies the auth bypass in index.ts — no JWT needed, only CRON_SECRET
    const res = await app.request('/api/cron/health-check', {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    // Status may be 200 or 503 depending on DB availability, but should never be JWT 401.
    expect(res.status).not.toBe(401);
  });
});
