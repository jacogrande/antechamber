import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseSitemap,
  discoverPages,
  generateHeuristicUrls,
} from '@/lib/crawl/sitemap';
import type { RobotsResult, CrawlConfig } from '@/lib/crawl/types';
import { DEFAULT_CRAWL_CONFIG } from '@/lib/crawl/types';
import { createStubFetch } from './helpers';

const FIXTURES = join(import.meta.dir, 'fixtures');
const sitemapXml = readFileSync(join(FIXTURES, 'sitemap.xml'), 'utf-8');
const sitemapIndexXml = readFileSync(
  join(FIXTURES, 'sitemap-index.xml'),
  'utf-8',
);

function permissiveRobots(sitemapUrls: string[] = []): RobotsResult {
  return {
    found: false,
    isAllowed: () => true,
    sitemapUrls,
    crawlDelayMs: null,
  };
}

// ---------------------------------------------------------------------------
// parseSitemap
// ---------------------------------------------------------------------------

describe('parseSitemap', () => {
  it('parses <urlset> and returns same-origin URLs', async () => {
    const urls = await parseSitemap(
      'https://example.com/sitemap.xml',
      sitemapXml,
      'https://example.com',
    );
    expect(urls).toContain('https://example.com/');
    expect(urls).toContain('https://example.com/about');
    expect(urls).toContain('https://example.com/products');
    expect(urls).toContain('https://example.com/contact');
  });

  it('filters out other-origin URLs', async () => {
    const urls = await parseSitemap(
      'https://example.com/sitemap.xml',
      sitemapXml,
      'https://example.com',
    );
    expect(urls).not.toContain('https://other-domain.com/page');
  });

  it('handles <sitemapindex> with recursive fetch', async () => {
    const childSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/page-a</loc></url>
  <url><loc>https://example.com/page-b</loc></url>
</urlset>`;

    const blogSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/blog/post-1</loc></url>
</urlset>`;

    const stubFetch = createStubFetch(
      new Map([
        [
          'https://example.com/sitemap-pages.xml',
          { status: 200, body: childSitemap, headers: { 'content-type': 'application/xml' } },
        ],
        [
          'https://example.com/sitemap-blog.xml',
          { status: 200, body: blogSitemap, headers: { 'content-type': 'application/xml' } },
        ],
      ]),
    );

    const urls = await parseSitemap(
      'https://example.com/sitemap-index.xml',
      sitemapIndexXml,
      'https://example.com',
      stubFetch,
    );
    expect(urls).toContain('https://example.com/page-a');
    expect(urls).toContain('https://example.com/page-b');
    expect(urls).toContain('https://example.com/blog/post-1');
  });

  it('handles malformed XML gracefully', async () => {
    const urls = await parseSitemap(
      'https://example.com/sitemap.xml',
      'not valid xml <><><<',
      'https://example.com',
    );
    expect(urls).toEqual([]);
  });

  it('returns empty array for empty urlset', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;
    const urls = await parseSitemap(
      'https://example.com/sitemap.xml',
      xml,
      'https://example.com',
    );
    expect(urls).toEqual([]);
  });

  it('skips unreachable child sitemaps in sitemapindex', async () => {
    const errorFetch = (() => {
      throw new Error('Network error');
    }) as unknown as typeof fetch;

    const urls = await parseSitemap(
      'https://example.com/sitemap-index.xml',
      sitemapIndexXml,
      'https://example.com',
      errorFetch,
    );
    // Should return empty rather than throw
    expect(urls).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// generateHeuristicUrls
// ---------------------------------------------------------------------------

describe('generateHeuristicUrls', () => {
  it('generates URLs from paths', () => {
    const pages = generateHeuristicUrls('https://example.com', [
      '/',
      '/about',
    ]);
    expect(pages).toHaveLength(2);
    expect(pages[0].url).toBe('https://example.com/');
    expect(pages[1].url).toBe('https://example.com/about');
  });

  it('marks all as heuristic source', () => {
    const pages = generateHeuristicUrls('https://example.com', ['/']);
    expect(pages[0].source).toBe('heuristic');
  });

  it('assigns sequential priority starting from 0', () => {
    const pages = generateHeuristicUrls('https://example.com', [
      '/',
      '/about',
      '/contact',
    ]);
    expect(pages[0].priority).toBe(0);
    expect(pages[1].priority).toBe(1);
    expect(pages[2].priority).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// discoverPages
// ---------------------------------------------------------------------------

describe('discoverPages', () => {
  it('uses sitemap URLs from robots when available', async () => {
    const stubFetch = createStubFetch(
      new Map([
        [
          'https://example.com/sitemap.xml',
          { status: 200, body: sitemapXml, headers: { 'content-type': 'application/xml' } },
        ],
      ]),
    );

    const robots = permissiveRobots(['https://example.com/sitemap.xml']);
    const pages = await discoverPages(
      'https://example.com',
      robots,
      DEFAULT_CRAWL_CONFIG,
      stubFetch,
    );

    expect(pages.length).toBeGreaterThan(0);
    expect(pages.some((p) => p.source === 'sitemap')).toBe(true);
  });

  it('falls back to /sitemap.xml when robots has no sitemaps', async () => {
    const stubFetch = createStubFetch(
      new Map([
        [
          'https://example.com/sitemap.xml',
          { status: 200, body: sitemapXml, headers: { 'content-type': 'application/xml' } },
        ],
      ]),
    );

    const robots = permissiveRobots([]);
    const pages = await discoverPages(
      'https://example.com',
      robots,
      DEFAULT_CRAWL_CONFIG,
      stubFetch,
    );

    expect(pages.length).toBeGreaterThan(0);
    expect(pages.some((p) => p.source === 'sitemap')).toBe(true);
  });

  it('falls back to heuristic paths when no sitemap found', async () => {
    const stubFetch = createStubFetch(
      new Map([
        [
          'https://example.com/sitemap.xml',
          { status: 404, body: 'Not found' },
        ],
      ]),
    );

    const robots = permissiveRobots([]);
    const config = {
      ...DEFAULT_CRAWL_CONFIG,
      heuristicPaths: ['/', '/about', '/contact'],
    };
    const pages = await discoverPages(
      'https://example.com',
      robots,
      config,
      stubFetch,
    );

    expect(pages).toHaveLength(3);
    expect(pages.every((p) => p.source === 'heuristic')).toBe(true);
  });

  it('deduplicates sitemap URLs', async () => {
    const duplicatedSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/page</loc></url>
  <url><loc>https://example.com/page</loc></url>
  <url><loc>https://example.com/other</loc></url>
</urlset>`;

    const stubFetch = createStubFetch(
      new Map([
        [
          'https://example.com/sitemap.xml',
          { status: 200, body: duplicatedSitemap, headers: { 'content-type': 'application/xml' } },
        ],
      ]),
    );

    const robots = permissiveRobots(['https://example.com/sitemap.xml']);
    const pages = await discoverPages(
      'https://example.com',
      robots,
      DEFAULT_CRAWL_CONFIG,
      stubFetch,
    );

    const urls = pages.map((p) => p.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('limits results to maxPages', async () => {
    // Create a sitemap with many URLs
    const locs = Array.from({ length: 50 }, (_, i) =>
      `<url><loc>https://example.com/page-${i}</loc></url>`,
    ).join('\n');
    const bigSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${locs}</urlset>`;

    const stubFetch = createStubFetch(
      new Map([
        [
          'https://example.com/sitemap.xml',
          { status: 200, body: bigSitemap, headers: { 'content-type': 'application/xml' } },
        ],
      ]),
    );

    const robots = permissiveRobots(['https://example.com/sitemap.xml']);
    const config = { ...DEFAULT_CRAWL_CONFIG, maxPages: 5 };
    const pages = await discoverPages(
      'https://example.com',
      robots,
      config,
      stubFetch,
    );

    expect(pages).toHaveLength(5);
  });

  it('sorts by priority (lower first)', async () => {
    const stubFetch = createStubFetch(
      new Map([
        [
          'https://example.com/sitemap.xml',
          { status: 404, body: 'Not found' },
        ],
      ]),
    );

    const robots = permissiveRobots([]);
    const config = {
      ...DEFAULT_CRAWL_CONFIG,
      heuristicPaths: ['/', '/about', '/contact'],
    };
    const pages = await discoverPages(
      'https://example.com',
      robots,
      config,
      stubFetch,
    );

    for (let i = 1; i < pages.length; i++) {
      expect(pages[i].priority).toBeGreaterThanOrEqual(pages[i - 1].priority);
    }
  });
});
