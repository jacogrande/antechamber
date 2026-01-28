import { describe, it, expect } from 'bun:test';
import {
  signPayload,
  buildSignatureHeader,
  verifySignature,
  generateWebhookSecret,
} from '../../../src/lib/webhooks/signing';

describe('Webhook Signing', () => {
  const testSecret = 'test-secret-key-12345';
  const testPayload = JSON.stringify({ event: 'test', data: 'hello' });

  describe('signPayload', () => {
    it('creates consistent HMAC-SHA256 signature', () => {
      const timestamp = 1700000000;
      const sig1 = signPayload(testPayload, testSecret, timestamp);
      const sig2 = signPayload(testPayload, testSecret, timestamp);

      expect(sig1).toBe(sig2);
      expect(sig1).toHaveLength(64); // hex-encoded SHA256
    });

    it('produces different signatures for different payloads', () => {
      const timestamp = 1700000000;
      const sig1 = signPayload('payload1', testSecret, timestamp);
      const sig2 = signPayload('payload2', testSecret, timestamp);

      expect(sig1).not.toBe(sig2);
    });

    it('produces different signatures for different secrets', () => {
      const timestamp = 1700000000;
      const sig1 = signPayload(testPayload, 'secret1', timestamp);
      const sig2 = signPayload(testPayload, 'secret2', timestamp);

      expect(sig1).not.toBe(sig2);
    });

    it('produces different signatures for different timestamps', () => {
      const sig1 = signPayload(testPayload, testSecret, 1700000000);
      const sig2 = signPayload(testPayload, testSecret, 1700000001);

      expect(sig1).not.toBe(sig2);
    });
  });

  describe('buildSignatureHeader', () => {
    it('builds header in correct format', () => {
      const header = buildSignatureHeader(testPayload, testSecret);

      expect(header).toMatch(/^t=\d+,v1=[a-f0-9]{64}$/);
    });

    it('includes current timestamp', () => {
      const before = Math.floor(Date.now() / 1000);
      const header = buildSignatureHeader(testPayload, testSecret);
      const after = Math.floor(Date.now() / 1000);

      const timestampMatch = header.match(/^t=(\d+),/);
      expect(timestampMatch).not.toBeNull();

      const timestamp = parseInt(timestampMatch![1], 10);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('verifySignature', () => {
    it('returns true for valid signature', () => {
      const header = buildSignatureHeader(testPayload, testSecret);
      const isValid = verifySignature(testPayload, header, testSecret);

      expect(isValid).toBe(true);
    });

    it('returns false for invalid signature', () => {
      const header = buildSignatureHeader(testPayload, testSecret);
      const isValid = verifySignature(testPayload, header, 'wrong-secret');

      expect(isValid).toBe(false);
    });

    it('returns false for tampered payload', () => {
      const header = buildSignatureHeader(testPayload, testSecret);
      const isValid = verifySignature('tampered-payload', header, testSecret);

      expect(isValid).toBe(false);
    });

    it('returns false for malformed header (missing timestamp)', () => {
      const isValid = verifySignature(testPayload, 'v1=abc123', testSecret);

      expect(isValid).toBe(false);
    });

    it('returns false for malformed header (missing signature)', () => {
      const isValid = verifySignature(testPayload, 't=1700000000', testSecret);

      expect(isValid).toBe(false);
    });

    it('rejects signatures older than tolerance', () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
      const signature = signPayload(testPayload, testSecret, oldTimestamp);
      const header = `t=${oldTimestamp},v1=${signature}`;

      const isValid = verifySignature(testPayload, header, testSecret, 300);

      expect(isValid).toBe(false);
    });

    it('accepts signatures within tolerance', () => {
      const recentTimestamp = Math.floor(Date.now() / 1000) - 60; // 1 minute ago
      const signature = signPayload(testPayload, testSecret, recentTimestamp);
      const header = `t=${recentTimestamp},v1=${signature}`;

      const isValid = verifySignature(testPayload, header, testSecret, 300);

      expect(isValid).toBe(true);
    });
  });

  describe('generateWebhookSecret', () => {
    it('generates 64-character hex string', () => {
      const secret = generateWebhookSecret();

      expect(secret).toHaveLength(64);
      expect(secret).toMatch(/^[a-f0-9]+$/);
    });

    it('generates unique secrets', () => {
      const secrets = new Set<string>();
      for (let i = 0; i < 100; i++) {
        secrets.add(generateWebhookSecret());
      }

      expect(secrets.size).toBe(100);
    });
  });
});
