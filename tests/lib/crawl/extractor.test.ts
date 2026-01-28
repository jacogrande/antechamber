import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { extractContent, stripHtml } from '@/lib/crawl/extractor';
import type { FetchedPage } from '@/lib/crawl/types';

const FIXTURES = join(import.meta.dir, 'fixtures');
const simplePage = readFileSync(join(FIXTURES, 'simple-page.html'), 'utf-8');
const complexPage = readFileSync(join(FIXTURES, 'complex-page.html'), 'utf-8');
const minimalPage = readFileSync(join(FIXTURES, 'minimal-page.html'), 'utf-8');

function makePage(html: string, url = 'https://example.com/page'): FetchedPage {
  return {
    url,
    html,
    statusCode: 200,
    contentType: 'text/html',
    fetchedAt: '2024-01-01T00:00:00.000Z',
  };
}

// ---------------------------------------------------------------------------
// extractContent
// ---------------------------------------------------------------------------

describe('extractContent', () => {
  describe('title extraction', () => {
    it('extracts title from simple page', () => {
      const result = extractContent(makePage(simplePage));
      expect(result.title).toBe('Simple Test Page');
    });

    it('extracts title from complex page', () => {
      const result = extractContent(makePage(complexPage));
      expect(result.title).toBe('Complex Test Page - Acme Corp');
    });

    it('returns empty string when no title', () => {
      const result = extractContent(makePage(minimalPage));
      expect(result.title).toBe('');
    });
  });

  describe('meta description extraction', () => {
    it('extracts meta description from simple page', () => {
      const result = extractContent(makePage(simplePage));
      expect(result.metaDescription).toBe(
        'A simple test page for extraction',
      );
    });

    it('extracts meta description from complex page', () => {
      const result = extractContent(makePage(complexPage));
      expect(result.metaDescription).toBe(
        'Acme Corp provides enterprise solutions',
      );
    });

    it('returns empty string when no meta description', () => {
      const result = extractContent(makePage(minimalPage));
      expect(result.metaDescription).toBe('');
    });
  });

  describe('heading extraction', () => {
    it('extracts h1-h3 from simple page', () => {
      const result = extractContent(makePage(simplePage));
      expect(result.headings).toContain('Welcome to Our Company');
      expect(result.headings).toContain('Our Services');
      expect(result.headings).toContain('Consulting');
    });

    it('extracts h1-h4 from complex page', () => {
      const result = extractContent(makePage(complexPage));
      expect(result.headings).toContain('Acme Corporation');
      expect(result.headings).toContain('Enterprise Solutions');
      expect(result.headings).toContain('Cloud Platform');
      expect(result.headings).toContain('Features');
      expect(result.headings).toContain('About Our Team');
    });

    it('returns empty array when no headings', () => {
      const result = extractContent(makePage(minimalPage));
      expect(result.headings).toEqual([]);
    });
  });

  describe('body text extraction', () => {
    it('includes paragraph text', () => {
      const result = extractContent(makePage(simplePage));
      expect(result.bodyText).toContain('We build great products');
      expect(result.bodyText).toContain('consulting, development, and support');
    });

    it('strips script content from body text', () => {
      const result = extractContent(makePage(complexPage));
      expect(result.bodyText).not.toContain('console.log');
      expect(result.bodyText).not.toContain('tracking');
      expect(result.bodyText).not.toContain('DOMContentLoaded');
    });

    it('strips style content from body text', () => {
      const result = extractContent(makePage(complexPage));
      expect(result.bodyText).not.toContain('font-family');
      expect(result.bodyText).not.toContain('display: none');
    });

    it('strips nav content from body text', () => {
      const result = extractContent(makePage(complexPage));
      // The nav link text should be removed
      expect(result.bodyText).not.toContain('Home About Contact');
    });

    it('strips footer content from body text', () => {
      const result = extractContent(makePage(complexPage));
      expect(result.bodyText).not.toContain('All rights reserved');
      expect(result.bodyText).not.toContain('Privacy Policy');
    });

    it('strips noscript content from body text', () => {
      const result = extractContent(makePage(complexPage));
      expect(result.bodyText).not.toContain('Please enable JavaScript');
    });

    it('includes main content from complex page', () => {
      const result = extractContent(makePage(complexPage));
      expect(result.bodyText).toContain('enterprise software solutions');
      expect(result.bodyText).toContain('Auto-scaling infrastructure');
    });

    it('handles minimal page', () => {
      const result = extractContent(makePage(minimalPage));
      expect(result.bodyText).toBe('Hello');
    });
  });

  describe('word count', () => {
    it('counts words in simple page', () => {
      const result = extractContent(makePage(simplePage));
      expect(result.wordCount).toBeGreaterThan(10);
    });

    it('counts words in minimal page', () => {
      const result = extractContent(makePage(minimalPage));
      expect(result.wordCount).toBe(1);
    });
  });

  describe('metadata', () => {
    it('preserves the URL', () => {
      const result = extractContent(
        makePage(simplePage, 'https://test.com/page'),
      );
      expect(result.url).toBe('https://test.com/page');
    });

    it('preserves the fetchedAt timestamp', () => {
      const page = makePage(simplePage);
      page.fetchedAt = '2024-06-15T12:00:00.000Z';
      const result = extractContent(page);
      expect(result.fetchedAt).toBe('2024-06-15T12:00:00.000Z');
    });
  });
});

// ---------------------------------------------------------------------------
// stripHtml
// ---------------------------------------------------------------------------

describe('stripHtml', () => {
  it('removes all HTML tags', () => {
    const result = stripHtml('<p>Hello <strong>world</strong></p>');
    expect(result).toBe('Hello world');
  });

  it('removes script elements', () => {
    const result = stripHtml(
      '<body><p>Text</p><script>alert("xss")</script></body>',
    );
    expect(result).not.toContain('alert');
    expect(result).toContain('Text');
  });

  it('removes style elements', () => {
    const result = stripHtml(
      '<body><style>.x{color:red}</style><p>Visible</p></body>',
    );
    expect(result).not.toContain('color');
    expect(result).toContain('Visible');
  });

  it('normalizes whitespace', () => {
    const result = stripHtml(
      '<body><p>  Multiple   spaces   and\n\nnewlines  </p></body>',
    );
    expect(result).toBe('Multiple spaces and newlines');
  });

  it('returns empty string for empty HTML', () => {
    const result = stripHtml('');
    expect(result).toBe('');
  });
});
