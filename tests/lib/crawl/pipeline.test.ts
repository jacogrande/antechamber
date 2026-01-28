import { describe, it, expect } from 'bun:test';
import { StubStorageClient } from '@/lib/storage';
import { ValidationError } from '@/lib/errors';
import { runCrawlPipeline } from '@/lib/crawl/pipeline';
import type { CrawlConfig } from '@/lib/crawl/types';
import { DEFAULT_CRAWL_CONFIG } from '@/lib/crawl/types';
import { createStubFetch } from './helpers';

const robotsTxt = `User-agent: *
Allow: /
Sitemap: https://example.com/sitemap.xml`;

const robotsWithDisallow = `User-agent: OnboardingBot/1.0
Disallow: /admin
Sitemap: https://example.com/sitemap.xml`;

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/</loc></url>
  <url><loc>https://example.com/about</loc></url>
</urlset>`;

const pageHtml = '<html><head><title>Test Page</title><meta name="description" content="Test description"></head><body><h1>Hello</h1><p>Some content here.</p></body></html>';

function makeConfig(overrides: Partial<CrawlConfig> = {}): CrawlConfig {
  return {
    ...DEFAULT_CRAWL_CONFIG,
    requestDelayMs: 0, // Fast tests
    ...overrides,
  };
}

function buildResponses() {
  return new Map([
    ['https://example.com/robots.txt', { status: 200, body: robotsTxt }],
    [
      'https://example.com/sitemap.xml',
      {
        status: 200,
        body: sitemapXml,
        headers: { 'content-type': 'application/xml' },
      },
    ],
    ['https://example.com/', { status: 200, body: pageHtml }],
    ['https://example.com/about', { status: 200, body: pageHtml }],
  ]);
}

// We need to mock dns.lookup to avoid real DNS resolution in tests.
// The validateUrl function does DNS resolution, so we mock at module level.
import { mock } from 'bun:test';

// Mock the dns module to avoid real DNS lookups
mock.module('node:dns', () => ({
  promises: {
    lookup: async (hostname: string) => {
      // Return a public IP for allowed hosts, private for blocked
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return { address: '127.0.0.1', family: 4 };
      }
      return { address: '93.184.216.34', family: 4 };
    },
  },
}));

// ---------------------------------------------------------------------------
// runCrawlPipeline
// ---------------------------------------------------------------------------

describe('runCrawlPipeline', () => {
  it('runs full happy path: robots → sitemap → fetch → extract → store', async () => {
    const storage = new StubStorageClient();
    const stubFetch = createStubFetch(buildResponses());
    const config = makeConfig();

    const result = await runCrawlPipeline(
      'https://example.com',
      'run-1',
      storage,
      config,
      stubFetch,
    );

    expect(result.origin).toBe('https://example.com');
    expect(result.discoveredPages.length).toBeGreaterThan(0);
    expect(result.fetchedPages.length).toBeGreaterThan(0);
    expect(result.extractedContent.length).toBe(result.fetchedPages.length);
    expect(result.artifactKeys.length).toBe(result.fetchedPages.length);
  });

  it('populates extracted content with title and text', async () => {
    const storage = new StubStorageClient();
    const stubFetch = createStubFetch(buildResponses());
    const config = makeConfig();

    const result = await runCrawlPipeline(
      'https://example.com',
      'run-2',
      storage,
      config,
      stubFetch,
    );

    const content = result.extractedContent[0];
    expect(content.title).toBe('Test Page');
    expect(content.metaDescription).toBe('Test description');
    expect(content.bodyText).toContain('Some content here');
    expect(content.wordCount).toBeGreaterThan(0);
  });

  it('stores artifacts that can be loaded back', async () => {
    const storage = new StubStorageClient();
    const stubFetch = createStubFetch(buildResponses());
    const config = makeConfig();

    const result = await runCrawlPipeline(
      'https://example.com',
      'run-3',
      storage,
      config,
      stubFetch,
    );

    // Verify at least one artifact was stored
    expect(result.artifactKeys.length).toBeGreaterThan(0);
    for (const key of result.artifactKeys) {
      expect(key.rawHtml).toBeTruthy();
      expect(key.text).toBeTruthy();
      // Verify the artifact exists in storage
      expect(await storage.exists(key.rawHtml)).toBe(true);
      expect(await storage.exists(key.text)).toBe(true);
    }
  });

  it('falls back to heuristic paths when no sitemap available', async () => {
    const responses = new Map([
      ['https://example.com/robots.txt', { status: 404, body: 'Not found' }],
      ['https://example.com/sitemap.xml', { status: 404, body: 'Not found' }],
      ['https://example.com/', { status: 200, body: pageHtml }],
      ['https://example.com/about', { status: 200, body: pageHtml }],
      ['https://example.com/about-us', { status: 404, body: 'Not found' }],
      ['https://example.com/pricing', { status: 404, body: 'Not found' }],
      ['https://example.com/contact', { status: 404, body: 'Not found' }],
      ['https://example.com/contact-us', { status: 404, body: 'Not found' }],
      ['https://example.com/services', { status: 404, body: 'Not found' }],
      ['https://example.com/products', { status: 404, body: 'Not found' }],
      ['https://example.com/team', { status: 404, body: 'Not found' }],
      ['https://example.com/careers', { status: 404, body: 'Not found' }],
      ['https://example.com/faq', { status: 404, body: 'Not found' }],
      ['https://example.com/blog', { status: 404, body: 'Not found' }],
    ]);

    const storage = new StubStorageClient();
    const stubFetch = createStubFetch(responses);
    const config = makeConfig();

    const result = await runCrawlPipeline(
      'https://example.com',
      'run-4',
      storage,
      config,
      stubFetch,
    );

    // Should still discover pages via heuristic
    expect(result.discoveredPages.length).toBeGreaterThan(0);
    expect(result.discoveredPages.every((p) => p.source === 'heuristic')).toBe(
      true,
    );
    // Should fetch at least the pages that returned 200
    expect(result.fetchedPages.length).toBeGreaterThanOrEqual(1);
  });

  it('tracks skipped URLs (robots disallow + fetch failures)', async () => {
    const responses = new Map([
      [
        'https://example.com/robots.txt',
        { status: 200, body: robotsWithDisallow },
      ],
      [
        'https://example.com/sitemap.xml',
        {
          status: 200,
          body: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/</loc></url>
  <url><loc>https://example.com/admin</loc></url>
  <url><loc>https://example.com/about</loc></url>
</urlset>`,
          headers: { 'content-type': 'application/xml' },
        },
      ],
      ['https://example.com/', { status: 200, body: pageHtml }],
      ['https://example.com/admin', { status: 200, body: pageHtml }],
      ['https://example.com/about', { status: 500, body: 'Server error' }],
    ]);

    const storage = new StubStorageClient();
    const stubFetch = createStubFetch(responses);
    const config = makeConfig();

    const result = await runCrawlPipeline(
      'https://example.com',
      'run-5',
      storage,
      config,
      stubFetch,
    );

    // /admin blocked by robots, /about failed with 500
    expect(result.skippedUrls).toContain('https://example.com/admin');
    expect(result.skippedUrls).toContain('https://example.com/about');
  });

  it('throws ValidationError for invalid URL', async () => {
    const storage = new StubStorageClient();
    const stubFetch = createStubFetch(new Map());

    await expect(
      runCrawlPipeline('not-a-url', 'run-6', storage, makeConfig(), stubFetch),
    ).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for private IP', async () => {
    const storage = new StubStorageClient();
    const stubFetch = createStubFetch(new Map());

    await expect(
      runCrawlPipeline(
        'http://localhost',
        'run-7',
        storage,
        makeConfig(),
        stubFetch,
      ),
    ).rejects.toThrow(ValidationError);
  });

  it('returns empty results when all fetches fail', async () => {
    const responses = new Map([
      ['https://example.com/robots.txt', { status: 200, body: robotsTxt }],
      [
        'https://example.com/sitemap.xml',
        {
          status: 200,
          body: sitemapXml,
          headers: { 'content-type': 'application/xml' },
        },
      ],
      ['https://example.com/', { status: 500, body: 'Error' }],
      ['https://example.com/about', { status: 500, body: 'Error' }],
    ]);

    const storage = new StubStorageClient();
    const stubFetch = createStubFetch(responses);
    const config = makeConfig();

    const result = await runCrawlPipeline(
      'https://example.com',
      'run-8',
      storage,
      config,
      stubFetch,
    );

    expect(result.fetchedPages).toHaveLength(0);
    expect(result.extractedContent).toHaveLength(0);
    expect(result.artifactKeys).toHaveLength(0);
    expect(result.skippedUrls.length).toBeGreaterThan(0);
  });
});
