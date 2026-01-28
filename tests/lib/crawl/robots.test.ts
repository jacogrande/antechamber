import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseRobots, fetchRobots } from '@/lib/crawl/robots';
import { DEFAULT_CRAWL_CONFIG } from '@/lib/crawl/types';
import { createStubFetch } from './helpers';

const FIXTURES = join(import.meta.dir, 'fixtures');
const robotsTxt = readFileSync(join(FIXTURES, 'robots.txt'), 'utf-8');

// ---------------------------------------------------------------------------
// parseRobots
// ---------------------------------------------------------------------------

describe('parseRobots', () => {
  it('reports found = true', () => {
    const result = parseRobots('https://example.com', robotsTxt);
    expect(result.found).toBe(true);
  });

  it('disallows /admin for OnboardingBot', () => {
    const result = parseRobots('https://example.com', robotsTxt);
    expect(result.isAllowed('https://example.com/admin')).toBe(false);
  });

  it('disallows /private/ for OnboardingBot', () => {
    const result = parseRobots('https://example.com', robotsTxt);
    expect(result.isAllowed('https://example.com/private/secret')).toBe(false);
  });

  it('allows /private/public-page for OnboardingBot', () => {
    const result = parseRobots('https://example.com', robotsTxt);
    expect(result.isAllowed('https://example.com/private/public-page')).toBe(
      true,
    );
  });

  it('allows /about for OnboardingBot', () => {
    const result = parseRobots('https://example.com', robotsTxt);
    expect(result.isAllowed('https://example.com/about')).toBe(true);
  });

  it('extracts sitemap URLs', () => {
    const result = parseRobots('https://example.com', robotsTxt);
    expect(result.sitemapUrls).toContain('https://example.com/sitemap.xml');
    expect(result.sitemapUrls).toContain(
      'https://example.com/sitemap-blog.xml',
    );
    expect(result.sitemapUrls).toHaveLength(2);
  });

  it('extracts crawl delay', () => {
    const result = parseRobots('https://example.com', robotsTxt);
    expect(result.crawlDelayMs).toBe(2000);
  });

  it('handles empty robots.txt', () => {
    const result = parseRobots('https://example.com', '');
    expect(result.found).toBe(true);
    expect(result.isAllowed('https://example.com/anything')).toBe(true);
    expect(result.sitemapUrls).toHaveLength(0);
    expect(result.crawlDelayMs).toBeNull();
  });

  it('uses the specified user agent for matching', () => {
    const content = `
User-agent: CustomBot
Disallow: /blocked

User-agent: *
Allow: /`;
    const result = parseRobots('https://example.com', content, 'CustomBot');
    expect(result.isAllowed('https://example.com/blocked')).toBe(false);

    const otherResult = parseRobots(
      'https://example.com',
      content,
      'OtherBot',
    );
    expect(otherResult.isAllowed('https://example.com/blocked')).toBe(true);
  });

  it('handles wildcard patterns', () => {
    const content = `
User-agent: OnboardingBot/1.0
Disallow: /api/*
Allow: /api/public`;
    const result = parseRobots('https://example.com', content);
    expect(result.isAllowed('https://example.com/api/private')).toBe(false);
    expect(result.isAllowed('https://example.com/api/public')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// fetchRobots
// ---------------------------------------------------------------------------

describe('fetchRobots', () => {
  it('parses robots.txt on 200 response', async () => {
    const stubFetch = createStubFetch(
      new Map([
        [
          'https://example.com/robots.txt',
          { status: 200, body: robotsTxt },
        ],
      ]),
    );

    const result = await fetchRobots(
      'https://example.com',
      DEFAULT_CRAWL_CONFIG,
      stubFetch,
    );
    expect(result.found).toBe(true);
    expect(result.sitemapUrls).toHaveLength(2);
  });

  it('returns permissive result on 404', async () => {
    const stubFetch = createStubFetch(
      new Map([
        [
          'https://example.com/robots.txt',
          { status: 404, body: 'Not found' },
        ],
      ]),
    );

    const result = await fetchRobots(
      'https://example.com',
      DEFAULT_CRAWL_CONFIG,
      stubFetch,
    );
    expect(result.found).toBe(false);
    expect(result.isAllowed('https://example.com/anything')).toBe(true);
    expect(result.sitemapUrls).toHaveLength(0);
  });

  it('returns permissive result on network error', async () => {
    const errorFetch = (() => {
      throw new Error('Network error');
    }) as unknown as typeof fetch;

    const result = await fetchRobots(
      'https://example.com',
      DEFAULT_CRAWL_CONFIG,
      errorFetch,
    );
    expect(result.found).toBe(false);
    expect(result.isAllowed('https://example.com/anything')).toBe(true);
  });
});
