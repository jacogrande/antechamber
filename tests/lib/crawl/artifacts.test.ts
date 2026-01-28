import { describe, it, expect } from 'bun:test';
import { StubStorageClient } from '@/lib/storage';
import {
  artifactKeys,
  storeRawHtml,
  storeExtractedContent,
  loadRawHtml,
  loadExtractedContent,
  storePageArtifacts,
} from '@/lib/crawl/artifacts';
import { hashUrl } from '@/lib/crawl/url';
import type { ExtractedContent, FetchedPage } from '@/lib/crawl/types';

const testUrl = 'https://example.com/page';
const runId = 'run-123';

function makePage(): FetchedPage {
  return {
    url: testUrl,
    html: '<html><body><p>Hello World</p></body></html>',
    statusCode: 200,
    contentType: 'text/html',
    fetchedAt: '2024-01-01T00:00:00.000Z',
  };
}

function makeContent(): ExtractedContent {
  return {
    url: testUrl,
    title: 'Test Page',
    metaDescription: 'A test page',
    headings: ['Hello World'],
    bodyText: 'Hello World',
    wordCount: 2,
    fetchedAt: '2024-01-01T00:00:00.000Z',
  };
}

// ---------------------------------------------------------------------------
// artifactKeys
// ---------------------------------------------------------------------------

describe('artifactKeys', () => {
  it('generates correct key format', () => {
    const keys = artifactKeys(runId, testUrl);
    const hash = hashUrl(testUrl);
    expect(keys.rawHtml).toBe(`${runId}/raw/${hash}.html.gz`);
    expect(keys.text).toBe(`${runId}/text/${hash}.json`);
  });

  it('uses deterministic URL hashing', () => {
    const keys1 = artifactKeys(runId, testUrl);
    const keys2 = artifactKeys(runId, testUrl);
    expect(keys1.rawHtml).toBe(keys2.rawHtml);
    expect(keys1.text).toBe(keys2.text);
  });

  it('produces different keys for different URLs', () => {
    const keys1 = artifactKeys(runId, 'https://example.com/page1');
    const keys2 = artifactKeys(runId, 'https://example.com/page2');
    expect(keys1.rawHtml).not.toBe(keys2.rawHtml);
  });

  it('includes runId prefix', () => {
    const keys = artifactKeys('my-run', testUrl);
    expect(keys.rawHtml.startsWith('my-run/')).toBe(true);
    expect(keys.text.startsWith('my-run/')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Store / Load raw HTML (gzip roundtrip)
// ---------------------------------------------------------------------------

describe('storeRawHtml / loadRawHtml', () => {
  it('roundtrips HTML through gzip compression', async () => {
    const storage = new StubStorageClient();
    const page = makePage();

    const key = await storeRawHtml(storage, runId, page);
    expect(key).toBeTruthy();

    const loaded = await loadRawHtml(storage, runId, testUrl);
    expect(loaded).toBe(page.html);
  });

  it('returns the storage key', async () => {
    const storage = new StubStorageClient();
    const key = await storeRawHtml(storage, runId, makePage());
    const expectedKeys = artifactKeys(runId, testUrl);
    expect(key).toBe(expectedKeys.rawHtml);
  });

  it('returns null for non-existent key', async () => {
    const storage = new StubStorageClient();
    const loaded = await loadRawHtml(storage, runId, 'https://nonexistent.com');
    expect(loaded).toBeNull();
  });

  it('handles large HTML content', async () => {
    const storage = new StubStorageClient();
    const largeHtml = '<html>' + 'x'.repeat(100_000) + '</html>';
    const page: FetchedPage = {
      ...makePage(),
      html: largeHtml,
    };

    await storeRawHtml(storage, runId, page);
    const loaded = await loadRawHtml(storage, runId, testUrl);
    expect(loaded).toBe(largeHtml);
  });
});

// ---------------------------------------------------------------------------
// Store / Load extracted content (JSON roundtrip)
// ---------------------------------------------------------------------------

describe('storeExtractedContent / loadExtractedContent', () => {
  it('roundtrips extracted content through JSON', async () => {
    const storage = new StubStorageClient();
    const content = makeContent();

    const key = await storeExtractedContent(storage, runId, content);
    expect(key).toBeTruthy();

    const loaded = await loadExtractedContent(storage, runId, testUrl);
    expect(loaded).toEqual(content);
  });

  it('returns the storage key', async () => {
    const storage = new StubStorageClient();
    const key = await storeExtractedContent(storage, runId, makeContent());
    const expectedKeys = artifactKeys(runId, testUrl);
    expect(key).toBe(expectedKeys.text);
  });

  it('returns null for non-existent key', async () => {
    const storage = new StubStorageClient();
    const loaded = await loadExtractedContent(
      storage,
      runId,
      'https://nonexistent.com',
    );
    expect(loaded).toBeNull();
  });

  it('preserves all fields including arrays', async () => {
    const storage = new StubStorageClient();
    const content: ExtractedContent = {
      ...makeContent(),
      headings: ['H1 Title', 'H2 Section', 'H3 Subsection'],
    };

    await storeExtractedContent(storage, runId, content);
    const loaded = await loadExtractedContent(storage, runId, testUrl);
    expect(loaded!.headings).toEqual([
      'H1 Title',
      'H2 Section',
      'H3 Subsection',
    ]);
  });
});

// ---------------------------------------------------------------------------
// storePageArtifacts
// ---------------------------------------------------------------------------

describe('storePageArtifacts', () => {
  it('stores both HTML and content artifacts', async () => {
    const storage = new StubStorageClient();
    const page = makePage();
    const content = makeContent();

    const keys = await storePageArtifacts(storage, runId, page, content);
    expect(keys.rawHtml).toBeTruthy();
    expect(keys.text).toBeTruthy();

    // Verify both are loadable
    const loadedHtml = await loadRawHtml(storage, runId, testUrl);
    expect(loadedHtml).toBe(page.html);

    const loadedContent = await loadExtractedContent(storage, runId, testUrl);
    expect(loadedContent).toEqual(content);
  });

  it('returns the correct key pair', async () => {
    const storage = new StubStorageClient();
    const keys = await storePageArtifacts(
      storage,
      runId,
      makePage(),
      makeContent(),
    );
    const expected = artifactKeys(runId, testUrl);
    expect(keys.rawHtml).toBe(expected.rawHtml);
    expect(keys.text).toBe(expected.text);
  });
});
