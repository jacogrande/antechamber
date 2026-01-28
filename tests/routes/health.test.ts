import { describe, it, expect } from 'bun:test';
import app from '../../src/index';

describe('GET /health', () => {
  it('returns status ok', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: 'ok' });
  });
});
