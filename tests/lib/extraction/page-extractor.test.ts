import { describe, test, expect } from 'bun:test';
import { extractFieldsFromPage } from '@/lib/extraction/page-extractor';
import {
  createStubLlmClient,
  makeFieldDefinition,
  makeExtractedContent,
} from './helpers';
import basicResponse from './fixtures/llm-response-basic.json';

describe('extractFieldsFromPage', () => {
  const fields = [
    makeFieldDefinition({ key: 'company_name', type: 'string' }),
    makeFieldDefinition({ key: 'industry', type: 'string' }),
  ];

  test('calls LLM and returns parsed fields', async () => {
    const client = createStubLlmClient({
      responses: [{ match: 'example.com', response: basicResponse }],
    });

    const page = makeExtractedContent({ url: 'https://example.com/about' });
    const result = await extractFieldsFromPage(page, fields, client);

    expect(result.url).toBe('https://example.com/about');
    expect(result.pageTitle).toBe('About Us - Example Corp');
    expect(result.fields).toHaveLength(2);
    expect(result.fields[0].key).toBe('company_name');
    expect(result.fields[0].value).toBe('Example Corp');
  });

  test('skips pages with fewer than 10 words', async () => {
    const client = createStubLlmClient({ responses: [] });

    const page = makeExtractedContent({
      bodyText: 'Too short',
      wordCount: 2,
    });
    const result = await extractFieldsFromPage(page, fields, client);

    expect(result.fields).toHaveLength(0);
  });

  test('returns empty fields for empty LLM response', async () => {
    const client = createStubLlmClient({
      defaultResponse: { extractions: [] },
    });

    const page = makeExtractedContent();
    const result = await extractFieldsFromPage(page, fields, client);

    expect(result.fields).toHaveLength(0);
    expect(result.url).toBe(page.url);
  });

  test('passes correct page URL and title through', async () => {
    const client = createStubLlmClient({
      defaultResponse: basicResponse,
    });

    const page = makeExtractedContent({
      url: 'https://custom.com/page',
      title: 'Custom Page Title',
      fetchedAt: '2024-06-01T00:00:00Z',
    });
    const result = await extractFieldsFromPage(page, fields, client);

    expect(result.url).toBe('https://custom.com/page');
    expect(result.pageTitle).toBe('Custom Page Title');
    expect(result.fetchedAt).toBe('2024-06-01T00:00:00Z');
  });

  test('custom minWordCount allows page with fewer words', async () => {
    const client = createStubLlmClient({
      defaultResponse: basicResponse,
    });

    // Default minWordCount is 10, this page has 8 words
    const page = makeExtractedContent({
      bodyText: 'This page has only eight words total here',
      wordCount: 8,
    });

    // With default config (minWordCount: 10), page is skipped
    const skipped = await extractFieldsFromPage(page, fields, client);
    expect(skipped.fields).toHaveLength(0);

    // With custom minWordCount: 5, page is processed
    const processed = await extractFieldsFromPage(page, fields, client, { minWordCount: 5 });
    expect(processed.fields.length).toBeGreaterThan(0);
  });

  test('uses config model if provided', async () => {
    let capturedOptions: Record<string, unknown> | undefined;
    const client: ReturnType<typeof createStubLlmClient> = {
      async chat() {
        return { text: '', usage: { inputTokens: 0, outputTokens: 0 } };
      },
      async chatWithTools(_system, _messages, _tools, options) {
        capturedOptions = options as Record<string, unknown>;
        return { toolName: 'extract_fields', input: { extractions: [] }, usage: { inputTokens: 0, outputTokens: 0 } };
      },
    };

    const page = makeExtractedContent();
    await extractFieldsFromPage(page, fields, client, {
      model: 'claude-opus-4-20250514',
    });

    expect(capturedOptions?.model).toBe('claude-opus-4-20250514');
  });
});
