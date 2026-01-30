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
  console.log(`[crawl] Starting pipeline for ${rawUrl}`);

  // 1. Validate the input URL (throws ValidationError on failure)
  console.log('[crawl] Validating URL...');
  const validated = await validateUrl(rawUrl);
  console.log(`[crawl] URL validated, origin: ${validated.origin}`);

  // 2. Fetch + parse robots.txt
  console.log('[crawl] Fetching robots.txt...');
  const robots = await fetchRobots(validated.origin, config, fetchFn);
  console.log(`[crawl] robots.txt loaded (${robots.isAllowed(validated.origin) ? 'crawling allowed' : 'restrictions apply'})`);

  // 3. Discover pages (sitemap → heuristic fallback)
  console.log('[crawl] Discovering pages (sitemap + heuristics)...');
  const discoveredPages = await discoverPages(
    validated.origin,
    robots,
    config,
    fetchFn,
  );
  console.log(`[crawl] Discovered ${discoveredPages.length} pages`);

  // 4. Fetch pages (respects robots, concurrency, rate limiting)
  console.log(`[crawl] Fetching pages (max ${config.maxPages}, concurrency ${config.concurrency})...`);
  const fetchedPages = await fetchPages(discoveredPages, robots, config, fetchFn);
  console.log(`[crawl] Fetched ${fetchedPages.length} pages successfully`);

  // Track which URLs were discovered but not fetched
  const fetchedUrls = new Set(fetchedPages.map((p) => p.url));
  const skippedUrls = discoveredPages
    .map((p) => p.url)
    .filter((url) => !fetchedUrls.has(url));

  if (skippedUrls.length > 0) {
    console.log(`[crawl] Skipped ${skippedUrls.length} URLs`);
  }

  // 5. Extract content from each fetched page
  console.log('[crawl] Extracting content from pages...');
  const extractedContent = fetchedPages.map(extractContent);
  const totalWords = extractedContent.reduce((sum, c) => sum + c.wordCount, 0);
  console.log(`[crawl] Extracted ${totalWords} total words from ${extractedContent.length} pages`);

  // 6. Store artifacts for each page
  console.log('[crawl] Storing artifacts...');
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
  console.log(`[crawl] Stored ${artifactKeys.length} page artifacts`);

  console.log('[crawl] Pipeline complete');
  return {
    origin: validated.origin,
    discoveredPages,
    fetchedPages,
    extractedContent,
    artifactKeys,
    skippedUrls,
  };
}
