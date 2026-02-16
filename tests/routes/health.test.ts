import { describe, it, expect } from 'bun:test';
import app from '../../src/index';

describe('GET /health', () => {
  it('returns status ok with db check', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.db).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
  });
});
