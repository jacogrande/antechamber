import { describe, it, expect, mock } from 'bun:test';
import { ValidationError } from '@/lib/errors';

// Mock DNS to avoid real network calls in tests
mock.module('node:dns', () => ({
  promises: {
    lookup: async (hostname: string) => {
      if (hostname === 'unresolvable.invalid') {
        throw new Error('getaddrinfo ENOTFOUND unresolvable.invalid');
      }
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return { address: '127.0.0.1', family: 4 };
      }
      if (hostname === 'internal.example.com') {
        return { address: '10.0.0.1', family: 4 };
      }
      // Default: return public IP
      return { address: '93.184.216.34', family: 4 };
    },
  },
}));

// Import AFTER mock so the mock is in place
import { normalizeUrl, validateUrl, isPrivateIp, hashUrl } from '@/lib/crawl/url';

// ---------------------------------------------------------------------------
// normalizeUrl
// ---------------------------------------------------------------------------

describe('normalizeUrl', () => {
  it('lowercases scheme and host', () => {
    expect(normalizeUrl('HTTP://EXAMPLE.COM/Path')).toBe(
      'http://example.com/Path',
    );
  });

  it('removes default port 80 for http', () => {
    expect(normalizeUrl('http://example.com:80/page')).toBe(
      'http://example.com/page',
    );
  });

  it('removes default port 443 for https', () => {
    expect(normalizeUrl('https://example.com:443/page')).toBe(
      'https://example.com/page',
    );
  });

  it('preserves non-default ports', () => {
    expect(normalizeUrl('http://example.com:8080/page')).toBe(
      'http://example.com:8080/page',
    );
  });

  it('removes fragment', () => {
    expect(normalizeUrl('https://example.com/page#section')).toBe(
      'https://example.com/page',
    );
  });

  it('sorts query parameters', () => {
    expect(normalizeUrl('https://example.com/page?z=1&a=2')).toBe(
      'https://example.com/page?a=2&z=1',
    );
  });

  it('preserves trailing slash on root', () => {
    expect(normalizeUrl('https://example.com')).toBe(
      'https://example.com/',
    );
  });

  it('preserves path', () => {
    expect(normalizeUrl('https://example.com/about')).toBe(
      'https://example.com/about',
    );
  });

  it('handles URL with no query or fragment', () => {
    expect(normalizeUrl('https://example.com/page')).toBe(
      'https://example.com/page',
    );
  });
});

// ---------------------------------------------------------------------------
// isPrivateIp
// ---------------------------------------------------------------------------

describe('isPrivateIp', () => {
  it('detects 127.0.0.0/8 (loopback)', () => {
    expect(isPrivateIp('127.0.0.1')).toBe(true);
    expect(isPrivateIp('127.255.255.255')).toBe(true);
  });

  it('detects 10.0.0.0/8', () => {
    expect(isPrivateIp('10.0.0.1')).toBe(true);
    expect(isPrivateIp('10.255.255.255')).toBe(true);
  });

  it('detects 172.16.0.0/12', () => {
    expect(isPrivateIp('172.16.0.1')).toBe(true);
    expect(isPrivateIp('172.31.255.255')).toBe(true);
    expect(isPrivateIp('172.15.0.1')).toBe(false);
    expect(isPrivateIp('172.32.0.1')).toBe(false);
  });

  it('detects 192.168.0.0/16', () => {
    expect(isPrivateIp('192.168.0.1')).toBe(true);
    expect(isPrivateIp('192.168.255.255')).toBe(true);
  });

  it('detects 169.254.0.0/16 (link-local)', () => {
    expect(isPrivateIp('169.254.0.1')).toBe(true);
    expect(isPrivateIp('169.254.169.254')).toBe(true);
  });

  it('detects 0.0.0.0', () => {
    expect(isPrivateIp('0.0.0.1')).toBe(true);
  });

  it('allows public IPv4 addresses', () => {
    expect(isPrivateIp('8.8.8.8')).toBe(false);
    expect(isPrivateIp('93.184.216.34')).toBe(false);
    expect(isPrivateIp('1.1.1.1')).toBe(false);
  });

  it('detects IPv6 loopback (::1)', () => {
    expect(isPrivateIp('::1')).toBe(true);
  });

  it('detects IPv6 unspecified (::)', () => {
    expect(isPrivateIp('::')).toBe(true);
  });

  it('detects fc00::/7 (unique local)', () => {
    expect(isPrivateIp('fc00::1')).toBe(true);
    expect(isPrivateIp('fd12:3456::1')).toBe(true);
  });

  it('detects fe80::/10 (link-local IPv6)', () => {
    expect(isPrivateIp('fe80::1')).toBe(true);
  });

  it('allows public IPv6 addresses', () => {
    expect(isPrivateIp('2001:4860:4860::8888')).toBe(false);
  });

  it('detects IPv6-mapped IPv4 private addresses', () => {
    expect(isPrivateIp('::ffff:127.0.0.1')).toBe(true);
    expect(isPrivateIp('::ffff:10.0.0.1')).toBe(true);
    expect(isPrivateIp('::ffff:192.168.1.1')).toBe(true);
  });

  it('allows IPv6-mapped IPv4 public addresses', () => {
    expect(isPrivateIp('::ffff:8.8.8.8')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateUrl
// ---------------------------------------------------------------------------

describe('validateUrl', () => {
  it('accepts valid http URL', async () => {
    // Use a real public domain for DNS resolution
    const result = await validateUrl('http://example.com');
    expect(result.href).toContain('example.com');
    expect(result.hostname).toBe('example.com');
    expect(result.origin).toBe('http://example.com');
  });

  it('accepts valid https URL', async () => {
    const result = await validateUrl('https://example.com');
    expect(result.hostname).toBe('example.com');
    expect(result.origin).toBe('https://example.com');
  });

  it('rejects invalid URL', async () => {
    await expect(validateUrl('not-a-url')).rejects.toThrow(ValidationError);
  });

  it('rejects ftp protocol', async () => {
    await expect(validateUrl('ftp://example.com')).rejects.toThrow(
      ValidationError,
    );
  });

  it('rejects file protocol', async () => {
    await expect(validateUrl('file:///etc/passwd')).rejects.toThrow(
      ValidationError,
    );
  });

  it('rejects javascript protocol', async () => {
    await expect(validateUrl('javascript:alert(1)')).rejects.toThrow(
      ValidationError,
    );
  });

  it('rejects non-standard ports', async () => {
    await expect(validateUrl('https://example.com:8443')).rejects.toThrow(
      ValidationError,
    );
  });

  it('rejects unresolvable hostnames', async () => {
    await expect(
      validateUrl('https://unresolvable.invalid'),
    ).rejects.toThrow(ValidationError);
  });

  it('rejects localhost (resolves to 127.0.0.1)', async () => {
    await expect(validateUrl('http://localhost')).rejects.toThrow(
      ValidationError,
    );
  });

  it('rejects 127.0.0.1 directly', async () => {
    await expect(validateUrl('http://127.0.0.1')).rejects.toThrow(
      ValidationError,
    );
  });

  it('normalizes the returned URL', async () => {
    const result = await validateUrl('HTTPS://EXAMPLE.COM/page#frag');
    expect(result.href).toBe('https://example.com/page');
    expect(result.hostname).toBe('example.com');
  });
});

// ---------------------------------------------------------------------------
// hashUrl
// ---------------------------------------------------------------------------

describe('hashUrl', () => {
  it('returns a hex string', () => {
    const hash = hashUrl('https://example.com/page');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic', () => {
    const a = hashUrl('https://example.com/page');
    const b = hashUrl('https://example.com/page');
    expect(a).toBe(b);
  });

  it('produces different hashes for different URLs', () => {
    const a = hashUrl('https://example.com/page1');
    const b = hashUrl('https://example.com/page2');
    expect(a).not.toBe(b);
  });
});
