import { createHash } from 'node:crypto';
import { promises as dns } from 'node:dns';
import { ValidationError } from '../errors';
import { isPrivateIp } from '../utils/network';
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
