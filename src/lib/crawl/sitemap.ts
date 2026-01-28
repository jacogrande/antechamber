import * as cheerio from 'cheerio';
import type {
  CrawlConfig,
  DiscoveredPage,
  FetchFn,
  RobotsResult,
} from './types';
import { DEFAULT_CRAWL_CONFIG } from './types';

// ---------------------------------------------------------------------------
// Extract URLs from a <urlset> element
// ---------------------------------------------------------------------------

function extractUrlsFromUrlset($: cheerio.CheerioAPI, origin: string): string[] {
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
// Parse a sitemap XML document (urlset or sitemapindex)
// ---------------------------------------------------------------------------

export async function parseSitemap(
  xml: string,
  origin: string,
  config: CrawlConfig = DEFAULT_CRAWL_CONFIG,
  fetchFn: FetchFn = fetch,
): Promise<string[]> {
  const $ = cheerio.load(xml, { xmlMode: true });

  // Handle <sitemapindex> — 1-level recursive fetch
  const sitemapLocs = $('sitemapindex > sitemap > loc');
  if (sitemapLocs.length > 0) {
    const childUrls: string[] = [];
    sitemapLocs.each((_, el) => {
      const loc = $(el).text().trim();
      if (loc) childUrls.push(loc);
    });

    const urls: string[] = [];
    for (const childUrl of childUrls) {
      try {
        const res = await fetchFn(childUrl, {
          headers: { 'User-Agent': config.userAgent },
        });
        if (res.ok) {
          const childXml = await res.text();
          const child$ = cheerio.load(childXml, { xmlMode: true });
          urls.push(...extractUrlsFromUrlset(child$, origin));
        }
      } catch {
        // Skip unreachable child sitemaps
      }
    }

    return urls;
  }

  // Handle <urlset>
  return extractUrlsFromUrlset($, origin);
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
      const res = await fetchFn(sitemapUrl, {
        headers: { 'User-Agent': config.userAgent },
      });
      if (res.ok) {
        const xml = await res.text();
        const urls = await parseSitemap(xml, origin, config, fetchFn);
        sitemapUrls.push(...urls);
      }
    } catch {
      // Skip unreachable sitemaps
    }
  }

  let pages: DiscoveredPage[];

  if (sitemapUrls.length > 0) {
    // Deduplicate sitemap URLs and convert to DiscoveredPage
    const seen = new Set<string>();
    pages = [];
    for (const url of sitemapUrls) {
      if (!seen.has(url)) {
        seen.add(url);
        pages.push({ url, source: 'sitemap', priority: 100 + pages.length });
      }
    }
  } else {
    // Heuristic fallback (already unique by construction)
    pages = generateHeuristicUrls(origin, config.heuristicPaths);
  }

  // Sort by priority (lower = higher priority)
  pages.sort((a, b) => a.priority - b.priority);

  // Limit to maxPages
  return pages.slice(0, config.maxPages);
}

