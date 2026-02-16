import { describe, it, expect } from 'bun:test';
import {
  generatePublishableKey,
  hashPublishableKey,
  extractKeyPrefix,
} from '../../src/lib/publishable-keys';

describe('publishable-keys', () => {
  describe('generatePublishableKey', () => {
    it('should generate key with live environment prefix', () => {
      // Arrange & Act
      const key = generatePublishableKey('live');

      // Assert
      expect(key).toStartWith('pk_live_');
      expect(key).toMatch(/^pk_live_[a-zA-Z0-9]{32}$/);
    });

    it('should generate key with test environment prefix', () => {
      // Arrange & Act
      const key = generatePublishableKey('test');

      // Assert
      expect(key).toStartWith('pk_test_');
      expect(key).toMatch(/^pk_test_[a-zA-Z0-9]{32}$/);
    });

    it('should match regex pattern for live keys', () => {
      // Arrange & Act
      const key = generatePublishableKey('live');

      // Assert
      expect(key).toMatch(/^pk_(live|test)_[a-zA-Z0-9]+$/);
    });

    it('should match regex pattern for test keys', () => {
      // Arrange & Act
      const key = generatePublishableKey('test');

      // Assert
      expect(key).toMatch(/^pk_(live|test)_[a-zA-Z0-9]+$/);
    });

    it('should generate unique keys on each invocation', () => {
      // Arrange & Act
      const key1 = generatePublishableKey('live');
      const key2 = generatePublishableKey('live');
      const key3 = generatePublishableKey('test');
      const key4 = generatePublishableKey('test');

      // Assert
      expect(key1).not.toBe(key2);
      expect(key3).not.toBe(key4);
      expect(key1).not.toBe(key3);
    });

    it('should generate keys with exactly 32 random characters', () => {
      // Arrange & Act
      const liveKey = generatePublishableKey('live');
      const testKey = generatePublishableKey('test');

      // Assert
      const liveRandom = liveKey.replace('pk_live_', '');
      const testRandom = testKey.replace('pk_test_', '');
      expect(liveRandom).toHaveLength(32);
      expect(testRandom).toHaveLength(32);
    });
  });

  describe('hashPublishableKey', () => {
    it('should return 64 character hex string', () => {
      // Arrange
      const key = 'pk_test_abc123xyz789';

      // Act
      const hash = hashPublishableKey(key);

      // Assert
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce same hash for same input', () => {
      // Arrange
      const key = 'pk_live_sameInputValue12345678901234';

      // Act
      const hash1 = hashPublishableKey(key);
      const hash2 = hashPublishableKey(key);

      // Assert
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      // Arrange
      const key1 = 'pk_test_differentInput1234567890123';
      const key2 = 'pk_test_differentInput1234567890124';

      // Act
      const hash1 = hashPublishableKey(key1);
      const hash2 = hashPublishableKey(key2);

      // Assert
      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hashes for live vs test keys with same random part', () => {
      // Arrange
      const randomPart = 'sameRandomPart12345678901234567';
      const liveKey = `pk_live_${randomPart}`;
      const testKey = `pk_test_${randomPart}`;

      // Act
      const liveHash = hashPublishableKey(liveKey);
      const testHash = hashPublishableKey(testKey);

      // Assert
      expect(liveHash).not.toBe(testHash);
    });

    it('should produce valid SHA-256 hash', () => {
      // Arrange
      const key = generatePublishableKey('test');

      // Act
      const hash = hashPublishableKey(key);

      // Assert - SHA-256 always produces 256 bits = 64 hex chars
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('extractKeyPrefix', () => {
    it('should return first 12 characters of live key', () => {
      // Arrange
      const key = 'pk_live_abcdefghijklmnopqrstuvwxyz123456';

      // Act
      const prefix = extractKeyPrefix(key);

      // Assert
      expect(prefix).toBe('pk_live_abcd');
      expect(prefix).toHaveLength(12);
    });

    it('should return first 12 characters of test key', () => {
      // Arrange
      const key = 'pk_test_zyxwvutsrqponmlkjihgfedcba654321';

      // Act
      const prefix = extractKeyPrefix(key);

      // Assert
      expect(prefix).toBe('pk_test_zyxw');
      expect(prefix).toHaveLength(12);
    });

    it('should work with generated live keys', () => {
      // Arrange
      const key = generatePublishableKey('live');

      // Act
      const prefix = extractKeyPrefix(key);

      // Assert
      expect(prefix).toStartWith('pk_live_');
      expect(prefix).toHaveLength(12);
    });

    it('should work with generated test keys', () => {
      // Arrange
      const key = generatePublishableKey('test');

      // Act
      const prefix = extractKeyPrefix(key);

      // Assert
      expect(prefix).toStartWith('pk_test_');
      expect(prefix).toHaveLength(12);
    });

    it('should extract different prefixes for different keys', () => {
      // Arrange
      const key1 = 'pk_live_AAAbbbcccddd1234567890123456';
      const key2 = 'pk_live_XXXyyyzzz1112345678901234567';

      // Act
      const prefix1 = extractKeyPrefix(key1);
      const prefix2 = extractKeyPrefix(key2);

      // Assert
      expect(prefix1).toBe('pk_live_AAAb');
      expect(prefix2).toBe('pk_live_XXXy');
      expect(prefix1).not.toBe(prefix2);
    });
  });
});
