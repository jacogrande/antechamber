import { promises as dns } from 'node:dns';
import { ValidationError } from '../errors';
import { isPrivateIp } from '../utils/network';

// ---------------------------------------------------------------------------
// Webhook URL validation (SSRF prevention)
// ---------------------------------------------------------------------------

/**
 * Validate a webhook endpoint URL to prevent SSRF attacks.
 * - Must be HTTPS
 * - Must not resolve to private/internal IP addresses
 */
export async function validateWebhookUrl(raw: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ValidationError(`Invalid URL: ${raw}`);
  }

  // Require HTTPS
  if (url.protocol !== 'https:') {
    throw new ValidationError('Webhook URL must use HTTPS');
  }

  // Disallow localhost and common internal hostnames
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.localhost')
  ) {
    throw new ValidationError('Webhook URL cannot target localhost or internal hosts');
  }

  // DNS resolve to check for private IPs
  try {
    const addresses = await dns.resolve4(url.hostname);
    for (const addr of addresses) {
      if (isPrivateIp(addr)) {
        throw new ValidationError(
          `Webhook URL resolves to private IP address (${addr})`,
        );
      }
    }
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    // Try IPv6
    try {
      const addresses = await dns.resolve6(url.hostname);
      for (const addr of addresses) {
        if (isPrivateIp(addr)) {
          throw new ValidationError(
            `Webhook URL resolves to private IP address (${addr})`,
          );
        }
      }
    } catch (err6) {
      if (err6 instanceof ValidationError) throw err6;
      throw new ValidationError(
        `Cannot resolve webhook URL hostname: ${url.hostname}`,
      );
    }
  }
}
