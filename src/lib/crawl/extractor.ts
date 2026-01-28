import * as cheerio from 'cheerio';
import type { ExtractedContent, FetchedPage } from './types';

// Elements to remove before text extraction
const NOISE_SELECTORS = [
  'script',
  'style',
  'noscript',
  'svg',
  'nav',
  'footer',
  'iframe',
  'header',
].join(', ');

// ---------------------------------------------------------------------------
// Strip HTML → clean text
// ---------------------------------------------------------------------------

export function stripHtml(html: string): string {
  const $ = cheerio.load(html);

  // Remove noise elements
  $(NOISE_SELECTORS).remove();

  // Get text content and normalize whitespace
  const text = $('body').text();
  return text.replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Extract structured content from a fetched page
// ---------------------------------------------------------------------------

export function extractContent(page: FetchedPage): ExtractedContent {
  const $ = cheerio.load(page.html);

  // Title: <title> tag content
  const title = $('title').first().text().trim();

  // Meta description
  const metaDescription =
    $('meta[name="description"]').attr('content')?.trim() ?? '';

  // Headings h1–h6
  const headings: string[] = [];
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const text = $(el).text().trim();
    if (text) headings.push(text);
  });

  // Clean body text
  const bodyText = stripHtml(page.html);

  // Word count
  const wordCount = bodyText ? bodyText.split(/\s+/).length : 0;

  return {
    url: page.url,
    title,
    metaDescription,
    headings,
    bodyText,
    wordCount,
    fetchedAt: page.fetchedAt,
  };
}
