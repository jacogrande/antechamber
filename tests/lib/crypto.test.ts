import { describe, it, expect, beforeEach, afterAll } from 'bun:test';
import { encrypt, decrypt, isEncrypted, resetCryptoKeyCache } from '../../src/lib/crypto';

// 32-byte key = 64 hex chars
const TEST_KEY = 'a'.repeat(64);

beforeEach(() => {
  resetCryptoKeyCache();
  process.env.WEBHOOK_ENCRYPTION_KEY = TEST_KEY;
});

afterAll(() => {
  resetCryptoKeyCache();
  delete process.env.WEBHOOK_ENCRYPTION_KEY;
});

describe('encrypt/decrypt', () => {
  it('should round-trip a secret', () => {
    const secret = 'whsec_test_secret_1234567890';
    const encrypted = encrypt(secret);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(secret);
  });

  it('should produce different ciphertext each time (random IV)', () => {
    const secret = 'whsec_same_input';
    const a = encrypt(secret);
    const b = encrypt(secret);
    expect(a).not.toBe(b);
    // Both should decrypt to the same value
    expect(decrypt(a)).toBe(secret);
    expect(decrypt(b)).toBe(secret);
  });

  it('should produce iv:ciphertext:tag format', () => {
    const encrypted = encrypt('test');
    const parts = encrypted.split(':');
    expect(parts).toHaveLength(3);
    // IV is 12 bytes = 24 hex chars
    expect(parts[0]).toHaveLength(24);
    // Auth tag is 16 bytes = 32 hex chars
    expect(parts[2]).toHaveLength(32);
  });

  it('should throw on invalid encrypted format', () => {
    expect(() => decrypt('invalid')).toThrow('Invalid encrypted format');
    expect(() => decrypt('a:b')).toThrow('Invalid encrypted format');
  });

  it('should throw on tampered ciphertext', () => {
    const encrypted = encrypt('secret');
    const parts = encrypted.split(':');
    // Tamper with the ciphertext
    const tampered = `${parts[0]}:${'ff'.repeat(parts[1].length / 2)}:${parts[2]}`;
    expect(() => decrypt(tampered)).toThrow();
  });

  it('should throw when key is missing', () => {
    resetCryptoKeyCache();
    delete process.env.WEBHOOK_ENCRYPTION_KEY;
    try {
      expect(() => encrypt('test')).toThrow('WEBHOOK_ENCRYPTION_KEY');
    } finally {
      process.env.WEBHOOK_ENCRYPTION_KEY = TEST_KEY;
      resetCryptoKeyCache();
    }
  });
});

describe('isEncrypted', () => {
  it('should return true for encrypted values', () => {
    const encrypted = encrypt('some-secret');
    expect(isEncrypted(encrypted)).toBe(true);
  });

  it('should return false for plaintext secrets', () => {
    expect(isEncrypted('whsec_abc123def456')).toBe(false);
    expect(isEncrypted('some-plain-secret')).toBe(false);
  });

  it('should return false for values with wrong part count', () => {
    expect(isEncrypted('only-one-part')).toBe(false);
    expect(isEncrypted('a:b')).toBe(false);
    expect(isEncrypted('a:b:c:d')).toBe(false);
  });

  it('should return false for values with wrong IV length', () => {
    // IV too short (should be 24 hex chars)
    expect(isEncrypted('abcdef:1234:' + 'a'.repeat(32))).toBe(false);
  });
});
