import { describe, test, expect } from 'bun:test';
import { extractAndSynthesize } from '@/lib/extraction/facade';
import type { ExtractionInput } from '@/lib/extraction/types';
import {
  createStubLlmClient,
  makeFieldDefinition,
  makeExtractedContent,
} from './helpers';
import basicResponse from './fixtures/llm-response-basic.json';

describe('extractAndSynthesize', () => {
  test('end-to-end happy path: 2 pages, 3 fields', async () => {
    const fields = [
      makeFieldDefinition({ key: 'company_name', type: 'string' }),
      makeFieldDefinition({ key: 'industry', type: 'string' }),
      makeFieldDefinition({ key: 'phone', type: 'string' }),
    ];

    const aboutResponse = {
      extractions: [
        { key: 'company_name', value: 'Acme Corp', confidence: 0.95, snippet: 'Acme Corp is a leader' },
        { key: 'industry', value: 'Technology', confidence: 0.85, snippet: 'technology company' },
      ],
    };
    const contactResponse = {
      extractions: [
        { key: 'company_name', value: 'acme corp', confidence: 0.9, snippet: 'Contact Acme Corp' },
        { key: 'phone', value: '5551234567', confidence: 0.92, snippet: 'Call us at 555-123-4567' },
      ],
    };

    const client = createStubLlmClient({
      responses: [
        { match: 'acme.com/about', response: aboutResponse },
        { match: 'acme.com/contact', response: contactResponse },
      ],
    });

    const input: ExtractionInput = {
      fields,
      pages: [
        makeExtractedContent({ url: 'https://acme.com/about', title: 'About', metaDescription: '' }),
        makeExtractedContent({ url: 'https://acme.com/contact', title: 'Contact', metaDescription: '' }),
      ],
    };

    const result = await extractAndSynthesize(input, client);

    expect(result.fields).toHaveLength(3);
    expect(result.pageResults).toHaveLength(2);

    const companyName = result.fields.find((f) => f.key === 'company_name')!;
    expect(companyName.value).toBe('Acme Corp');
    expect(companyName.status).toBe('auto');
    expect(companyName.citations).toHaveLength(2); // From both pages

    const industry = result.fields.find((f) => f.key === 'industry')!;
    expect(industry.value).toBe('Technology');
    expect(industry.status).toBe('auto');

    const phone = result.fields.find((f) => f.key === 'phone')!;
    expect(phone.value).toBe('+1 (555) 123-4567'); // Normalized!
    expect(phone.status).toBe('auto');
  });

  test('all unknown when no data extracted', async () => {
    const fields = [
      makeFieldDefinition({ key: 'company_name' }),
      makeFieldDefinition({ key: 'industry' }),
    ];

    const client = createStubLlmClient({
      defaultResponse: { extractions: [] },
    });

    const input: ExtractionInput = {
      fields,
      pages: [makeExtractedContent()],
    };

    const result = await extractAndSynthesize(input, client);
    expect(result.fields.every((f) => f.status === 'unknown')).toBe(true);
    expect(result.fields.every((f) => f.value === null)).toBe(true);
  });

  test('normalization is applied to phone fields', async () => {
    const fields = [makeFieldDefinition({ key: 'phone', type: 'string' })];

    const client = createStubLlmClient({
      defaultResponse: {
        extractions: [
          { key: 'phone', value: '5559876543', confidence: 0.9, snippet: 'Call 555-987-6543' },
        ],
      },
    });

    const input: ExtractionInput = {
      fields,
      pages: [makeExtractedContent()],
    };

    const result = await extractAndSynthesize(input, client);
    expect(result.fields[0].value).toBe('+1 (555) 987-6543');
  });

  test('validation demotes fields with issues', async () => {
    const fields = [
      makeFieldDefinition({
        key: 'email',
        type: 'string',
        validation: { regex: '^[^@]+@[^@]+\\.[^@]+$' },
      }),
    ];

    const client = createStubLlmClient({
      defaultResponse: {
        extractions: [
          { key: 'email', value: 'not-an-email', confidence: 0.9, snippet: 'contact: not-an-email' },
        ],
      },
    });

    const input: ExtractionInput = {
      fields,
      pages: [makeExtractedContent()],
    };

    const result = await extractAndSynthesize(input, client);
    expect(result.fields[0].status).toBe('needs_review');
    expect(result.fields[0].reason).toContain('pattern');
  });

  test('conflict detection across pages', async () => {
    const fields = [makeFieldDefinition({ key: 'company_name', type: 'string' })];

    const client = createStubLlmClient({
      responses: [
        {
          match: 'page1',
          response: {
            extractions: [
              { key: 'company_name', value: 'Acme Corp', confidence: 0.9, snippet: 'Acme Corp' },
            ],
          },
        },
        {
          match: 'page2',
          response: {
            extractions: [
              { key: 'company_name', value: 'Acme Corporation', confidence: 0.85, snippet: 'Acme Corporation' },
            ],
          },
        },
      ],
    });

    const input: ExtractionInput = {
      fields,
      pages: [
        makeExtractedContent({ url: 'https://example.com/page1', bodyText: 'page1 content here for matching' }),
        makeExtractedContent({ url: 'https://example.com/page2', bodyText: 'page2 content here for matching' }),
      ],
    };

    const result = await extractAndSynthesize(input, client);
    expect(result.fields[0].status).toBe('needs_review');
    expect(result.fields[0].reason).toContain('Conflicting');
  });

  test('sourceHints boost applied', async () => {
    const fields = [
      makeFieldDefinition({
        key: 'company_name',
        type: 'string',
        sourceHints: ['about'],
        confidenceThreshold: 0.8,
      }),
    ];

    const client = createStubLlmClient({
      defaultResponse: {
        extractions: [
          { key: 'company_name', value: 'Boosted Corp', confidence: 0.7, snippet: 'Boosted Corp' },
        ],
      },
    });

    const input: ExtractionInput = {
      fields,
      pages: [makeExtractedContent({ url: 'https://example.com/about' })],
    };

    // 0.7 + 0.15 boost = 0.85 >= 0.8 threshold → auto
    const result = await extractAndSynthesize(input, client);
    expect(result.fields[0].status).toBe('auto');
    expect(result.fields[0].confidence).toBeCloseTo(0.85);
  });

  test('empty pages produce all unknown', async () => {
    const fields = [
      makeFieldDefinition({ key: 'company_name' }),
      makeFieldDefinition({ key: 'industry' }),
    ];

    const client = createStubLlmClient({ responses: [] });

    const input: ExtractionInput = { fields, pages: [] };
    const result = await extractAndSynthesize(input, client);

    expect(result.fields).toHaveLength(2);
    expect(result.fields.every((f) => f.status === 'unknown')).toBe(true);
    expect(result.pageResults).toHaveLength(0);
  });

  test('bounded concurrency: max concurrent ≤ extractionConcurrency', async () => {
    const fields = [makeFieldDefinition({ key: 'company_name', type: 'string' })];

    let concurrent = 0;
    let maxConcurrent = 0;
    const client: ReturnType<typeof createStubLlmClient> = {
      async chat() {
        return { text: '', usage: { inputTokens: 0, outputTokens: 0 } };
      },
      async chatWithTools() {
        concurrent++;
        if (concurrent > maxConcurrent) maxConcurrent = concurrent;
        // Simulate async work to allow concurrency measurement
        await new Promise((resolve) => setTimeout(resolve, 10));
        concurrent--;
        return {
          toolName: 'extract_fields',
          input: {
            extractions: [
              { key: 'company_name', value: 'Test', confidence: 0.9, snippet: 'Test' },
            ],
          },
          usage: { inputTokens: 0, outputTokens: 0 },
        };
      },
    };

    const pages = Array.from({ length: 10 }, (_, i) =>
      makeExtractedContent({ url: `https://example.com/page${i}` }),
    );

    const input: ExtractionInput = { fields, pages };
    await extractAndSynthesize(input, client, { extractionConcurrency: 3 });

    expect(maxConcurrent).toBeLessThanOrEqual(3);
    expect(maxConcurrent).toBeGreaterThan(0);
  });

  test('output includes pageResults', async () => {
    const fields = [makeFieldDefinition({ key: 'company_name' })];

    const client = createStubLlmClient({
      defaultResponse: basicResponse,
    });

    const input: ExtractionInput = {
      fields,
      pages: [
        makeExtractedContent({ url: 'https://a.com' }),
        makeExtractedContent({ url: 'https://b.com' }),
      ],
    };

    const result = await extractAndSynthesize(input, client);
    expect(result.pageResults).toHaveLength(2);
    expect(result.pageResults[0].url).toBe('https://a.com');
    expect(result.pageResults[1].url).toBe('https://b.com');
  });

  test('normalization applied to company name', async () => {
    const fields = [makeFieldDefinition({ key: 'company_name', type: 'string' })];

    const client = createStubLlmClient({
      defaultResponse: {
        extractions: [
          { key: 'company_name', value: 'acme corp', confidence: 0.9, snippet: 'acme corp' },
        ],
      },
    });

    const input: ExtractionInput = {
      fields,
      pages: [makeExtractedContent()],
    };

    const result = await extractAndSynthesize(input, client);
    expect(result.fields[0].value).toBe('Acme Corp');
  });

  test('normalization applied to address', async () => {
    const fields = [makeFieldDefinition({ key: 'address', type: 'string' })];

    const client = createStubLlmClient({
      defaultResponse: {
        extractions: [
          {
            key: 'address',
            value: '123 Main Street, California',
            confidence: 0.9,
            snippet: '123 Main Street, California',
          },
        ],
      },
    });

    const input: ExtractionInput = {
      fields,
      pages: [makeExtractedContent()],
    };

    const result = await extractAndSynthesize(input, client);
    expect(result.fields[0].value).toBe('123 Main St, CA');
  });
});
