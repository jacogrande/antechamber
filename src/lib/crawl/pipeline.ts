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
import { createLogger } from '../logger';

const log = createLogger('crawl');

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
  log.info('Starting pipeline', { url: rawUrl, runId });

  // 1. Validate the input URL (throws ValidationError on failure)
  log.debug('Validating URL...');
  const validated = await validateUrl(rawUrl);
  log.debug('URL validated', { origin: validated.origin });

  // 2. Fetch + parse robots.txt
  log.debug('Fetching robots.txt...');
  const robots = await fetchRobots(validated.origin, config, fetchFn);
  log.debug('robots.txt loaded', { allowed: robots.isAllowed(validated.origin) });

  // 3. Discover pages (sitemap + heuristic fallback)
  log.debug('Discovering pages (sitemap + heuristics)...');
  const discoveredPages = await discoverPages(
    validated.origin,
    robots,
    config,
    fetchFn,
  );
  log.info('Discovered pages', { count: discoveredPages.length });

  // 4. Fetch pages (respects robots, concurrency, rate limiting)
  log.debug('Fetching pages', { maxPages: config.maxPages, concurrency: config.concurrency });
  const fetchedPages = await fetchPages(discoveredPages, robots, config, fetchFn);
  log.info('Fetched pages', { count: fetchedPages.length });

  // Track which URLs were discovered but not fetched
  const fetchedUrls = new Set(fetchedPages.map((p) => p.url));
  const skippedUrls = discoveredPages
    .map((p) => p.url)
    .filter((url) => !fetchedUrls.has(url));

  if (skippedUrls.length > 0) {
    log.debug('Skipped URLs', { count: skippedUrls.length });
  }

  // 5. Extract content from each fetched page
  log.debug('Extracting content from pages...');
  const extractedContent = fetchedPages.map(extractContent);
  const totalWords = extractedContent.reduce((sum, c) => sum + c.wordCount, 0);
  log.info('Extracted content', { totalWords, pageCount: extractedContent.length });

  // 6. Store artifacts for each page
  log.debug('Storing artifacts...');
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
  log.debug('Stored page artifacts', { count: artifactKeys.length });

  log.info('Pipeline complete');
  return {
    origin: validated.origin,
    discoveredPages,
    fetchedPages,
    extractedContent,
    artifactKeys,
    skippedUrls,
  };
}
