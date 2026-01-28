import crypto from 'crypto';

/**
 * Signs a webhook payload using HMAC-SHA256.
 * The signature is computed over: `${timestamp}.${payload}`
 */
export function signPayload(payload: string, secret: string, timestamp: number): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`${timestamp}.${payload}`);
  return hmac.digest('hex');
}

/**
 * Builds a Stripe-style signature header for webhook delivery.
 * Format: `t=<timestamp>,v1=<signature>`
 */
export function buildSignatureHeader(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signPayload(payload, secret, timestamp);
  return `t=${timestamp},v1=${signature}`;
}

/**
 * Verifies a webhook signature.
 * Returns true if the signature is valid, false otherwise.
 */
export function verifySignature(
  payload: string,
  signatureHeader: string,
  secret: string,
  toleranceSec = 300,
): boolean {
  const parts = signatureHeader.split(',');
  const timestampPart = parts.find((p) => p.startsWith('t='));
  const signaturePart = parts.find((p) => p.startsWith('v1='));

  if (!timestampPart || !signaturePart) {
    return false;
  }

  const timestamp = parseInt(timestampPart.slice(2), 10);
  const providedSignature = signaturePart.slice(3);

  // Check for replay attacks
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSec) {
    return false;
  }

  const expectedSignature = signPayload(payload, secret, timestamp);
  return crypto.timingSafeEqual(
    Buffer.from(providedSignature),
    Buffer.from(expectedSignature),
  );
}

/**
 * Generates a secure random secret for webhook signing.
 */
export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}
