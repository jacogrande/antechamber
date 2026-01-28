import type {
  CrawlConfig,
  CrawlPipelineResult,
  FetchFn,
  StorageClient,
} from './types';
import { DEFAULT_CRAWL_CONFIG } from './types';
import { validateUrl } from './url';
import { fetchRobots } from './robots';
import { discoverPages } from './sitemap';
import { fetchPages } from './fetcher';
import { extractContent } from './extractor';
import { storePageArtifacts } from './artifacts';

// ---------------------------------------------------------------------------
// Pipeline orchestrator
// ---------------------------------------------------------------------------

export async function runCrawlPipeline(
  rawUrl: string,
  runId: string,
  storage: StorageClient,
  config: CrawlConfig = DEFAULT_CRAWL_CONFIG,
  fetchFn: FetchFn = fetch,
): Promise<CrawlPipelineResult> {
  // 1. Validate the input URL (throws ValidationError on failure)
  const validated = await validateUrl(rawUrl);

  // 2. Fetch + parse robots.txt
  const robots = await fetchRobots(validated.origin, config, fetchFn);

  // 3. Discover pages (sitemap → heuristic fallback)
  const discoveredPages = await discoverPages(
    validated.origin,
    robots,
    config,
    fetchFn,
  );

  // 4. Fetch pages (respects robots, concurrency, rate limiting)
  const fetchedPages = await fetchPages(discoveredPages, robots, config, fetchFn);

  // Track which URLs were discovered but not fetched
  const fetchedUrls = new Set(fetchedPages.map((p) => p.url));
  const skippedUrls = discoveredPages
    .map((p) => p.url)
    .filter((url) => !fetchedUrls.has(url));

  // 5. Extract content from each fetched page
  const extractedContent = fetchedPages.map(extractContent);

  // 6. Store artifacts for each page
  const artifactKeys: { url: string; rawHtml: string; text: string }[] = [];
  for (let i = 0; i < fetchedPages.length; i++) {
    const keys = await storePageArtifacts(
      storage,
      runId,
      fetchedPages[i],
      extractedContent[i],
    );
    artifactKeys.push({
      url: fetchedPages[i].url,
      rawHtml: keys.rawHtml,
      text: keys.text,
    });
  }

  return {
    origin: validated.origin,
    discoveredPages,
    fetchedPages,
    extractedContent,
    artifactKeys,
    skippedUrls,
  };
}
