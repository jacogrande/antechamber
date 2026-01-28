import type { StorageClient } from '@/lib/storage';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface CrawlConfig {
  userAgent: string;
  maxPages: number;
  concurrency: number;
  requestDelayMs: number;
  requestTimeoutMs: number;
  heuristicPaths: string[];
}

export const DEFAULT_CRAWL_CONFIG: CrawlConfig = {
  userAgent: 'OnboardingBot/1.0',
  maxPages: 20,
  concurrency: 3,
  requestDelayMs: 500,
  requestTimeoutMs: 10_000,
  heuristicPaths: [
    '/',
    '/about',
    '/about-us',
    '/pricing',
    '/contact',
    '/contact-us',
    '/services',
    '/products',
    '/team',
    '/careers',
    '/faq',
    '/blog',
  ],
};

// ---------------------------------------------------------------------------
// Core data types
// ---------------------------------------------------------------------------

export interface ValidatedUrl {
  href: string;
  hostname: string;
  origin: string;
}

export interface RobotsResult {
  found: boolean;
  isAllowed: (url: string) => boolean;
  sitemapUrls: string[];
  crawlDelayMs: number | null;
}

export interface DiscoveredPage {
  url: string;
  source: 'sitemap' | 'heuristic';
  priority: number;
}

export interface FetchedPage {
  url: string;
  html: string;
  statusCode: number;
  contentType: string;
  fetchedAt: string;
}

export interface ExtractedContent {
  url: string;
  title: string;
  metaDescription: string;
  headings: string[];
  bodyText: string;
  wordCount: number;
  fetchedAt: string;
}

export interface ArtifactKeys {
  rawHtml: string;
  text: string;
}

// ---------------------------------------------------------------------------
// Injectable fetch type
// ---------------------------------------------------------------------------

export type FetchFn = typeof fetch;

// ---------------------------------------------------------------------------
// Pipeline result
// ---------------------------------------------------------------------------

export interface CrawlPipelineResult {
  origin: string;
  discoveredPages: DiscoveredPage[];
  fetchedPages: FetchedPage[];
  extractedContent: ExtractedContent[];
  artifactKeys: { url: string; rawHtml: string; text: string }[];
  skippedUrls: string[];
}

// Re-export StorageClient for convenience
export type { StorageClient };
