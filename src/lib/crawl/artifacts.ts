import { gzipSync, gunzipSync } from 'bun';
import type {
  ArtifactKeys,
  ExtractedContent,
  FetchedPage,
  StorageClient,
} from './types';
import { hashUrl } from './url';

// ---------------------------------------------------------------------------
// Key generation
// ---------------------------------------------------------------------------

export function artifactKeys(runId: string, url: string): ArtifactKeys {
  const hash = hashUrl(url);
  return {
    rawHtml: `${runId}/raw/${hash}.html.gz`,
    text: `${runId}/text/${hash}.json`,
  };
}

// ---------------------------------------------------------------------------
// Store raw HTML (gzipped)
// ---------------------------------------------------------------------------

export async function storeRawHtml(
  storage: StorageClient,
  runId: string,
  page: FetchedPage,
): Promise<string> {
  const keys = artifactKeys(runId, page.url);
  const compressed = gzipSync(Buffer.from(page.html, 'utf-8'));
  await storage.put(keys.rawHtml, compressed, 'application/gzip');
  return keys.rawHtml;
}

// ---------------------------------------------------------------------------
// Store extracted content (JSON)
// ---------------------------------------------------------------------------

export async function storeExtractedContent(
  storage: StorageClient,
  runId: string,
  content: ExtractedContent,
): Promise<string> {
  const keys = artifactKeys(runId, content.url);
  const json = JSON.stringify(content);
  await storage.put(keys.text, Buffer.from(json, 'utf-8'), 'application/json');
  return keys.text;
}

// ---------------------------------------------------------------------------
// Load raw HTML (gunzipped)
// ---------------------------------------------------------------------------

export async function loadRawHtml(
  storage: StorageClient,
  runId: string,
  url: string,
): Promise<string | null> {
  const keys = artifactKeys(runId, url);
  const data = await storage.get(keys.rawHtml);
  if (!data) return null;
  const decompressed = gunzipSync(new Uint8Array(data));
  return new TextDecoder().decode(decompressed);
}

// ---------------------------------------------------------------------------
// Load extracted content
// ---------------------------------------------------------------------------

export async function loadExtractedContent(
  storage: StorageClient,
  runId: string,
  url: string,
): Promise<ExtractedContent | null> {
  const keys = artifactKeys(runId, url);
  const data = await storage.get(keys.text);
  if (!data) return null;
  return JSON.parse(data.toString('utf-8')) as ExtractedContent;
}

// ---------------------------------------------------------------------------
// Store both artifacts for a page
// ---------------------------------------------------------------------------

export async function storePageArtifacts(
  storage: StorageClient,
  runId: string,
  page: FetchedPage,
  content: ExtractedContent,
): Promise<ArtifactKeys> {
  const [rawHtml, text] = await Promise.all([
    storeRawHtml(storage, runId, page),
    storeExtractedContent(storage, runId, content),
  ]);
  return { rawHtml, text };
}
