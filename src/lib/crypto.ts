import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const HEX_RE = /^[0-9a-f]+$/i;

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const hex = process.env.WEBHOOK_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('WEBHOOK_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)');
  }
  if (!HEX_RE.test(hex)) {
    throw new Error('WEBHOOK_ENCRYPTION_KEY must contain only hex characters');
  }
  cachedKey = Buffer.from(hex, 'hex');
  return cachedKey;
}

/** Reset cached key — useful in tests. */
export function resetCryptoKeyCache(): void {
  cachedKey = null;
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a string in the format `iv:ciphertext:tag` (hex-encoded).
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
}

/**
 * Decrypt a string produced by `encrypt()`.
 */
export function decrypt(encrypted: string): string {
  const key = getKey();
  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format: expected iv:ciphertext:tag');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const ciphertext = Buffer.from(parts[1], 'hex');
  const tag = Buffer.from(parts[2], 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

/**
 * Check if a value looks like an encrypted string (iv:ciphertext:tag hex format).
 * Used for backward compatibility with existing plaintext secrets.
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(':');
  if (parts.length !== 3) return false;
  const [iv, ct, tag] = parts;
  // IV = 12 bytes (24 hex), tag = 16 bytes (32 hex), ciphertext must be non-empty hex
  return (
    iv.length === 24 &&
    tag.length === 32 &&
    ct.length > 0 &&
    HEX_RE.test(iv) &&
    HEX_RE.test(ct) &&
    HEX_RE.test(tag)
  );
}
