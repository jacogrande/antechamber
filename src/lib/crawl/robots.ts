import robotsParser from 'robots-parser';
import type { CrawlConfig, FetchFn, RobotsResult } from './types';
import { DEFAULT_CRAWL_CONFIG } from './types';

// ---------------------------------------------------------------------------
// Parse robots.txt content
// ---------------------------------------------------------------------------

export function parseRobots(
  origin: string,
  content: string,
  userAgent: string = DEFAULT_CRAWL_CONFIG.userAgent,
): RobotsResult {
  const robotsUrl = `${origin}/robots.txt`;
  const robot = robotsParser(robotsUrl, content);

  // Extract sitemap URLs
  const sitemapUrls = robot.getSitemaps();

  // Extract crawl delay
  const crawlDelay = robot.getCrawlDelay(userAgent);

  return {
    found: true,
    isAllowed: (url: string) => robot.isAllowed(url, userAgent) ?? true,
    sitemapUrls,
    crawlDelayMs: crawlDelay != null ? crawlDelay * 1000 : null,
  };
}

// ---------------------------------------------------------------------------
// Fetch + parse robots.txt (graceful on failure)
// ---------------------------------------------------------------------------

export async function fetchRobots(
  origin: string,
  config: CrawlConfig = DEFAULT_CRAWL_CONFIG,
  fetchFn: FetchFn = fetch,
): Promise<RobotsResult> {
  const robotsUrl = `${origin}/robots.txt`;

  try {
    const response = await fetchFn(robotsUrl, {
      headers: { 'User-Agent': config.userAgent },
      signal: AbortSignal.timeout(config.requestTimeoutMs),
    });

    if (!response.ok) {
      return permissiveResult();
    }

    const content = await response.text();
    return parseRobots(origin, content, config.userAgent);
  } catch {
    // Network error, timeout, etc. → permissive (standard convention)
    return permissiveResult();
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function permissiveResult(): RobotsResult {
  return {
    found: false,
    isAllowed: () => true,
    sitemapUrls: [],
    crawlDelayMs: null,
  };
}
