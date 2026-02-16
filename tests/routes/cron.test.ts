import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import app from '../../src/index';

const CRON_SECRET = 'test-cron-secret-value';

beforeAll(() => {
  process.env.CRON_SECRET = CRON_SECRET;
});

afterAll(() => {
  delete process.env.CRON_SECRET;
});

describe('GET /api/cron/health-check', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const res = await app.request('/api/cron/health-check');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when secret does not match', async () => {
    const res = await app.request('/api/cron/health-check', {
      headers: { Authorization: 'Bearer wrong-secret' },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when Authorization header has no Bearer prefix', async () => {
    const res = await app.request('/api/cron/health-check', {
      headers: { Authorization: CRON_SECRET },
    });
    expect(res.status).toBe(401);
  });

  it('returns 200 with ok status when db is healthy and secret is valid', async () => {
    const res = await app.request('/api/cron/health-check', {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.db).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
  });

  it('does not require JWT auth (bypasses auth middleware)', async () => {
    // This verifies the auth bypass in index.ts — no JWT needed, only CRON_SECRET
    const res = await app.request('/api/cron/health-check', {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    // Should not get 401 from JWT auth middleware
    expect(res.status).toBe(200);
  });
});
