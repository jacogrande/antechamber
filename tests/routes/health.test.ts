import { describe, it, expect } from 'bun:test';
import { createHealthRoute } from '../../src/routes/health';

describe('GET /health', () => {
  const now = () => new Date('2026-01-01T00:00:00.000Z');

  it('returns status ok when db is healthy', async () => {
    const app = createHealthRoute({ checkDb: async () => true, now });
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.db).toBe('ok');
    expect(body.timestamp).toBe('2026-01-01T00:00:00.000Z');
  });

  it('returns degraded when db is unavailable', async () => {
    const app = createHealthRoute({ checkDb: async () => false, now });
    const res = await app.request('/health');
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe('degraded');
    expect(body.db).toBe('error');
    expect(body.timestamp).toBe('2026-01-01T00:00:00.000Z');
  });
});
