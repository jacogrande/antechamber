import type {
  CrawlConfig,
  DiscoveredPage,
  FetchedPage,
  FetchFn,
  RobotsResult,
} from './types';
import { DEFAULT_CRAWL_CONFIG } from './types';

// ---------------------------------------------------------------------------
// Internal: Semaphore for concurrency control
// ---------------------------------------------------------------------------

class Semaphore {
  private queue: (() => void)[] = [];
  private active = 0;

  constructor(private readonly max: number) {}

  async acquire(): Promise<void> {
    if (this.active < this.max) {
      this.active++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.active++;
        resolve();
      });
    });
  }

  release(): void {
    this.active--;
    const next = this.queue.shift();
    if (next) next();
  }
}

// ---------------------------------------------------------------------------
// Internal: Sleep helper
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Fetch a single page
// ---------------------------------------------------------------------------

export async function fetchPage(
  url: string,
  config: CrawlConfig = DEFAULT_CRAWL_CONFIG,
  fetchFn: FetchFn = fetch,
): Promise<FetchedPage | null> {
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

    const response = await fetchFn(url, {
      headers: { 'User-Agent': config.userAgent },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeout);
    const elapsed = Date.now() - startTime;

    // Skip non-success responses
    if (!response.ok) {
      console.log(`[fetch] ${url} → ${response.status} (${elapsed}ms) [skipped: non-2xx]`);
      return null;
    }

    // Check Content-Type — only accept HTML
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) {
      console.log(`[fetch] ${url} → ${response.status} (${elapsed}ms) [skipped: ${contentType}]`);
      return null;
    }

    const html = await response.text();
    console.log(`[fetch] ${url} → ${response.status} (${elapsed}ms, ${html.length} bytes)`);

    return {
      url,
      html,
      statusCode: response.status,
      contentType,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    const elapsed = Date.now() - startTime;
    const errMsg = err instanceof Error ? err.message : String(err);
    console.log(`[fetch] ${url} → ERROR (${elapsed}ms): ${errMsg}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Fetch multiple pages with concurrency + rate limiting
// ---------------------------------------------------------------------------

export async function fetchPages(
  pages: DiscoveredPage[],
  robots: RobotsResult,
  config: CrawlConfig = DEFAULT_CRAWL_CONFIG,
  fetchFn: FetchFn = fetch,
): Promise<FetchedPage[]> {
  const sem = new Semaphore(config.concurrency);

  // Respect robots crawl delay if it's larger than config delay
  const delayMs = Math.max(
    config.requestDelayMs,
    robots.crawlDelayMs ?? 0,
  );

  const results = await Promise.all(
    pages.map(async (page): Promise<FetchedPage | null> => {
      // Skip robots-disallowed URLs
      if (!robots.isAllowed(page.url)) return null;

      await sem.acquire();
      try {
        const result = await fetchPage(page.url, config, fetchFn);

        // Rate-limit: wait between requests
        await sleep(delayMs);

        return result;
      } finally {
        sem.release();
      }
    }),
  );

  // Filter out nulls (skipped or failed fetches)
  return results.filter((r): r is FetchedPage => r !== null);
}
