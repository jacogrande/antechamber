import { promises as dns } from 'node:dns';
import { ValidationError } from '@/lib/errors';

// ---------------------------------------------------------------------------
// Private IP detection (SSRF prevention)
// ---------------------------------------------------------------------------

function isPrivateIp(ip: string): boolean {
  // IPv6-mapped IPv4 (e.g. ::ffff:127.0.0.1) — extract the IPv4 part
  const v4Mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (v4Mapped) {
    return isPrivateIp(v4Mapped[1]);
  }

  // IPv4
  const v4Match = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4Match) {
    const [, a, b, c] = v4Match.map(Number);
    if (a === 127) return true;                          // 127.0.0.0/8
    if (a === 10) return true;                           // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true;    // 172.16.0.0/12
    if (a === 192 && b === 168) return true;             // 192.168.0.0/16
    if (a === 169 && b === 254) return true;             // 169.254.0.0/16
    if (a === 0 && b === 0 && c === 0) return true;      // 0.0.0.0/8
    return false;
  }

  // IPv6
  if (ip === '::1') return true;
  if (ip === '::') return true;

  // Normalize IPv6 for prefix checks
  const normalized = ip.toLowerCase();

  // fc00::/7 → fc or fd prefix
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

  // fe80::/10 → link-local
  if (normalized.startsWith('fe80')) return true;

  return false;
}

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
