import * as cheerio from 'cheerio';
import type {
  CrawlConfig,
  DiscoveredPage,
  FetchFn,
  RobotsResult,
} from './types';
import { DEFAULT_CRAWL_CONFIG } from './types';

// ---------------------------------------------------------------------------
// Parse a sitemap XML document (urlset or sitemapindex)
// ---------------------------------------------------------------------------

export async function parseSitemap(
  url: string,
  xml: string,
  origin: string,
  fetchFn: FetchFn = fetch,
): Promise<string[]> {
  const $ = cheerio.load(xml, { xmlMode: true });
  const urls: string[] = [];

  // Handle <sitemapindex> — 1-level recursive fetch
  const sitemapLocs = $('sitemapindex > sitemap > loc');
  if (sitemapLocs.length > 0) {
    const childUrls: string[] = [];
    sitemapLocs.each((_, el) => {
      const loc = $(el).text().trim();
      if (loc) childUrls.push(loc);
    });

    for (const childUrl of childUrls) {
      try {
        const res = await fetchFn(childUrl);
        if (res.ok) {
          const childXml = await res.text();
          const childParsed = await parseChildSitemap(childXml, origin);
          urls.push(...childParsed);
        }
      } catch {
        // Skip unreachable child sitemaps
      }
    }

    return urls;
  }

  // Handle <urlset>
  $('urlset > url > loc').each((_, el) => {
    const loc = $(el).text().trim();
    if (loc) {
      try {
        const parsed = new URL(loc);
        if (parsed.origin === origin) {
          urls.push(loc);
        }
      } catch {
        // Skip malformed URLs
      }
    }
  });

  return urls;
}

// Parse a child sitemap (no further recursion)
async function parseChildSitemap(
  xml: string,
  origin: string,
): Promise<string[]> {
  const $ = cheerio.load(xml, { xmlMode: true });
  const urls: string[] = [];

  $('urlset > url > loc').each((_, el) => {
    const loc = $(el).text().trim();
    if (loc) {
      try {
        const parsed = new URL(loc);
        if (parsed.origin === origin) {
          urls.push(loc);
        }
      } catch {
        // Skip malformed URLs
      }
    }
  });

  return urls;
}

// ---------------------------------------------------------------------------
// Generate heuristic URLs from common paths
// ---------------------------------------------------------------------------

export function generateHeuristicUrls(
  origin: string,
  paths: string[],
): DiscoveredPage[] {
  return paths.map((path, index) => ({
    url: `${origin}${path}`,
    source: 'heuristic' as const,
    priority: index,
  }));
}

// ---------------------------------------------------------------------------
// Discover pages: sitemap → heuristic fallback
// ---------------------------------------------------------------------------

export async function discoverPages(
  origin: string,
  robots: RobotsResult,
  config: CrawlConfig = DEFAULT_CRAWL_CONFIG,
  fetchFn: FetchFn = fetch,
): Promise<DiscoveredPage[]> {
  const sitemapUrls: string[] = [];

  // Try sitemap URLs from robots.txt
  const sitemapSources = robots.sitemapUrls.length > 0
    ? robots.sitemapUrls
    : [`${origin}/sitemap.xml`];

  for (const sitemapUrl of sitemapSources) {
    try {
      const res = await fetchFn(sitemapUrl);
      if (res.ok) {
        const xml = await res.text();
        const urls = await parseSitemap(sitemapUrl, xml, origin, fetchFn);
        sitemapUrls.push(...urls);
      }
    } catch {
      // Skip unreachable sitemaps
    }
  }

  let pages: DiscoveredPage[];

  if (sitemapUrls.length > 0) {
    // Deduplicate sitemap URLs
    const seen = new Set<string>();
    pages = [];
    for (const url of sitemapUrls) {
      if (!seen.has(url)) {
        seen.add(url);
        pages.push({ url, source: 'sitemap', priority: 100 + pages.length });
      }
    }
  } else {
    // Heuristic fallback
    pages = generateHeuristicUrls(origin, config.heuristicPaths);
  }

  // Deduplicate (sitemap pages might overlap with heuristic)
  const uniquePages = deduplicatePages(pages);

  // Sort by priority (lower = higher priority)
  uniquePages.sort((a, b) => a.priority - b.priority);

  // Limit to maxPages
  return uniquePages.slice(0, config.maxPages);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deduplicatePages(pages: DiscoveredPage[]): DiscoveredPage[] {
  const seen = new Set<string>();
  const result: DiscoveredPage[] = [];
  for (const page of pages) {
    if (!seen.has(page.url)) {
      seen.add(page.url);
      result.push(page);
    }
  }
  return result;
}
