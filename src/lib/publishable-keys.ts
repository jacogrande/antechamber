import crypto from 'crypto';

/**
 * Generates a publishable key for the given environment.
 * Format: pk_{env}_{32 random alphanumeric chars}
 * Must match client regex: /^pk_(live|test)_[a-zA-Z0-9]+$/
 */
export function generatePublishableKey(env: 'live' | 'test'): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.randomBytes(32);
  let random = '';
  for (let i = 0; i < 32; i++) {
    random += chars[bytes[i] % chars.length];
  }
  return `pk_${env}_${random}`;
}

/**
 * Hashes a publishable key using SHA-256 for storage.
 * Only the hash is stored; the raw key is shown once at creation.
 */
export function hashPublishableKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

/**
 * Extracts the display prefix from a raw publishable key.
 * Returns the first 12 characters (e.g., "pk_live_a1b2").
 */
export function extractKeyPrefix(rawKey: string): string {
  return rawKey.slice(0, 12);
}
