import { describe, it, expect } from 'bun:test';
import { fetchPage, fetchPages } from '@/lib/crawl/fetcher';
import type {
  CrawlConfig,
  DiscoveredPage,
  RobotsResult,
} from '@/lib/crawl/types';
import { DEFAULT_CRAWL_CONFIG } from '@/lib/crawl/types';
import { createStubFetch, createTrackingFetch } from './helpers';

function permissiveRobots(): RobotsResult {
  return {
    found: false,
    isAllowed: () => true,
    sitemapUrls: [],
    crawlDelayMs: null,
  };
}

function blockingRobots(blockedUrls: string[]): RobotsResult {
  const blocked = new Set(blockedUrls);
  return {
    found: true,
    isAllowed: (url: string) => !blocked.has(url),
    sitemapUrls: [],
    crawlDelayMs: null,
  };
}

function makePage(url: string, source: 'sitemap' | 'heuristic' = 'heuristic', priority = 0): DiscoveredPage {
  return { url, source, priority };
}

const htmlBody = '<html><head><title>Test</title></head><body><p>Content</p></body></html>';

// ---------------------------------------------------------------------------
// fetchPage
// ---------------------------------------------------------------------------

describe('fetchPage', () => {
  it('returns FetchedPage on success', async () => {
    const stubFetch = createStubFetch(
      new Map([
        ['https://example.com/page', { status: 200, body: htmlBody }],
      ]),
    );

    const result = await fetchPage(
      'https://example.com/page',
      DEFAULT_CRAWL_CONFIG,
      stubFetch,
    );
    expect(result).not.toBeNull();
    expect(result!.url).toBe('https://example.com/page');
    expect(result!.html).toBe(htmlBody);
    expect(result!.statusCode).toBe(200);
    expect(result!.fetchedAt).toBeTruthy();
  });

  it('returns null for non-HTML content type', async () => {
    const stubFetch = createStubFetch(
      new Map([
        [
          'https://example.com/data.json',
          {
            status: 200,
            body: '{"data": 1}',
            headers: { 'content-type': 'application/json' },
          },
        ],
      ]),
    );

    const result = await fetchPage(
      'https://example.com/data.json',
      DEFAULT_CRAWL_CONFIG,
      stubFetch,
    );
    expect(result).toBeNull();
  });

  it('returns null for error status codes', async () => {
    const stubFetch = createStubFetch(
      new Map([
        ['https://example.com/missing', { status: 404, body: 'Not found' }],
      ]),
    );

    const result = await fetchPage(
      'https://example.com/missing',
      DEFAULT_CRAWL_CONFIG,
      stubFetch,
    );
    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    const errorFetch = (() => {
      throw new Error('Network error');
    }) as unknown as typeof fetch;

    const result = await fetchPage(
      'https://example.com/page',
      DEFAULT_CRAWL_CONFIG,
      errorFetch,
    );
    expect(result).toBeNull();
  });

  it('sends User-Agent header', async () => {
    const { fetch: trackFetch, calls } = createTrackingFetch(
      new Map([
        ['https://example.com/page', { status: 200, body: htmlBody }],
      ]),
    );

    await fetchPage('https://example.com/page', DEFAULT_CRAWL_CONFIG, trackFetch);
    expect(calls).toHaveLength(1);
    expect(calls[0].init?.headers).toEqual(
      expect.objectContaining({ 'User-Agent': 'OnboardingBot/1.0' }),
    );
  });

  it('returns null on 500 status', async () => {
    const stubFetch = createStubFetch(
      new Map([
        ['https://example.com/error', { status: 500, body: 'Server error' }],
      ]),
    );

    const result = await fetchPage(
      'https://example.com/error',
      DEFAULT_CRAWL_CONFIG,
      stubFetch,
    );
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// fetchPages
// ---------------------------------------------------------------------------

describe('fetchPages', () => {
  it('fetches multiple pages', async () => {
    const stubFetch = createStubFetch(
      new Map([
        ['https://example.com/', { status: 200, body: htmlBody }],
        ['https://example.com/about', { status: 200, body: htmlBody }],
      ]),
    );

    const pages = [
      makePage('https://example.com/'),
      makePage('https://example.com/about'),
    ];

    const config = { ...DEFAULT_CRAWL_CONFIG, requestDelayMs: 0 };
    const results = await fetchPages(
      pages,
      permissiveRobots(),
      config,
      stubFetch,
    );

    expect(results).toHaveLength(2);
  });

  it('skips robots-disallowed URLs', async () => {
    const stubFetch = createStubFetch(
      new Map([
        ['https://example.com/', { status: 200, body: htmlBody }],
        ['https://example.com/admin', { status: 200, body: htmlBody }],
      ]),
    );

    const pages = [
      makePage('https://example.com/'),
      makePage('https://example.com/admin'),
    ];

    const robots = blockingRobots(['https://example.com/admin']);
    const config = { ...DEFAULT_CRAWL_CONFIG, requestDelayMs: 0 };
    const results = await fetchPages(pages, robots, config, stubFetch);

    expect(results).toHaveLength(1);
    expect(results[0].url).toBe('https://example.com/');
  });

  it('respects concurrency limit', async () => {
    let concurrent = 0;
    let maxConcurrent = 0;

    const slowFetch = (async (input: RequestInfo | URL, _init?: RequestInit) => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise((resolve) => setTimeout(resolve, 10));
      concurrent--;
      void (typeof input === 'string' ? input : input.toString());
      return new Response(htmlBody, {
        status: 200,
        headers: { 'content-type': 'text/html' },
      });
    }) as typeof fetch;

    const pages = Array.from({ length: 6 }, (_, i) =>
      makePage(`https://example.com/page-${i}`),
    );

    const config: CrawlConfig = {
      ...DEFAULT_CRAWL_CONFIG,
      concurrency: 2,
      requestDelayMs: 0,
    };

    await fetchPages(pages, permissiveRobots(), config, slowFetch);
    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  it('applies delay between requests', async () => {
    const { fetch: trackFetch, calls } = createTrackingFetch(
      new Map([
        ['https://example.com/page-0', { status: 200, body: htmlBody }],
        ['https://example.com/page-1', { status: 200, body: htmlBody }],
      ]),
    );

    const pages = [
      makePage('https://example.com/page-0'),
      makePage('https://example.com/page-1'),
    ];

    const config: CrawlConfig = {
      ...DEFAULT_CRAWL_CONFIG,
      concurrency: 1,
      requestDelayMs: 50,
    };

    await fetchPages(pages, permissiveRobots(), config, trackFetch);

    // Both should have been fetched
    expect(calls).toHaveLength(2);

    // With concurrency=1, the second call should be delayed
    if (calls.length === 2) {
      const gap = calls[1].timestamp - calls[0].timestamp;
      expect(gap).toBeGreaterThanOrEqual(40); // Allow some tolerance
    }
  });

  it('respects robots crawl delay when larger than config', async () => {
    const { fetch: trackFetch, calls } = createTrackingFetch(
      new Map([
        ['https://example.com/page-0', { status: 200, body: htmlBody }],
        ['https://example.com/page-1', { status: 200, body: htmlBody }],
      ]),
    );

    const pages = [
      makePage('https://example.com/page-0'),
      makePage('https://example.com/page-1'),
    ];

    const robots: RobotsResult = {
      found: true,
      isAllowed: () => true,
      sitemapUrls: [],
      crawlDelayMs: 100, // Larger than config's 0ms
    };

    const config: CrawlConfig = {
      ...DEFAULT_CRAWL_CONFIG,
      concurrency: 1,
      requestDelayMs: 0,
    };

    await fetchPages(pages, robots, config, trackFetch);
    expect(calls).toHaveLength(2);

    if (calls.length === 2) {
      const gap = calls[1].timestamp - calls[0].timestamp;
      expect(gap).toBeGreaterThanOrEqual(80); // Allow tolerance
    }
  });

  it('handles all fetches failing gracefully', async () => {
    const errorFetch = (() => {
      throw new Error('Network error');
    }) as unknown as typeof fetch;

    const pages = [
      makePage('https://example.com/page-0'),
      makePage('https://example.com/page-1'),
    ];

    const config = { ...DEFAULT_CRAWL_CONFIG, requestDelayMs: 0 };
    const results = await fetchPages(
      pages,
      permissiveRobots(),
      config,
      errorFetch,
    );

    expect(results).toHaveLength(0);
  });
});
