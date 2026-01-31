import { createHash } from 'node:crypto';
import { promises as dns } from 'node:dns';
import { ValidationError } from '../errors';
import type { ValidatedUrl } from './types';

// ---------------------------------------------------------------------------
// URL normalization
// ---------------------------------------------------------------------------

export function normalizeUrl(raw: string): string {
  const url = new URL(raw);

  // Lowercase scheme + host
  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase();

  // Remove default ports
  if (
    (url.protocol === 'http:' && url.port === '80') ||
    (url.protocol === 'https:' && url.port === '443')
  ) {
    url.port = '';
  }

  // Remove fragment
  url.hash = '';

  // Sort query params for determinism
  const params = new URLSearchParams(url.searchParams);
  const sorted = new URLSearchParams([...params.entries()].sort());
  url.search = sorted.toString() ? `?${sorted.toString()}` : '';

  return url.toString();
}

// ---------------------------------------------------------------------------
// Private IP detection (SSRF prevention)
// ---------------------------------------------------------------------------

export function isPrivateIp(ip: string): boolean {
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
    if (a === 0 && b === 0 && c === 0) return true;     // 0.0.0.0/8
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
// URL validation with DNS resolution
// ---------------------------------------------------------------------------

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const ALLOWED_PORTS = new Set(['', '80', '443']);

export async function validateUrl(raw: string): Promise<ValidatedUrl> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ValidationError(`Invalid URL: ${raw}`);
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new ValidationError(`Unsupported protocol: ${url.protocol}`);
  }

  if (!ALLOWED_PORTS.has(url.port)) {
    throw new ValidationError(`Non-standard port not allowed: ${url.port}`);
  }

  // DNS resolve to check for private IPs
  let address: string;
  try {
    const result = await dns.lookup(url.hostname);
    address = result.address;
  } catch {
    throw new ValidationError(`Cannot resolve hostname: ${url.hostname}`);
  }

  if (isPrivateIp(address)) {
    throw new ValidationError(`Private/reserved IP address not allowed: ${address}`);
  }

  const normalized = normalizeUrl(url.href);
  const normalizedUrl = new URL(normalized);

  return {
    href: normalizedUrl.href,
    hostname: normalizedUrl.hostname,
    origin: normalizedUrl.origin,
  };
}

// ---------------------------------------------------------------------------
// URL hashing
// ---------------------------------------------------------------------------

export function hashUrl(url: string): string {
  return createHash('sha256').update(url).digest('hex');
}
