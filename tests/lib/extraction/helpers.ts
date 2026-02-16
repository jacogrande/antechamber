import type { FieldDefinition } from '@/types/domain';
import type { ExtractedContent } from '@/lib/crawl/types';
import type {
  LlmClient,
  LlmToolCallResultWithUsage,
  PageExtractionResult,
  PageFieldExtraction,
} from '@/lib/extraction/types';

// ---------------------------------------------------------------------------
// Stub LLM Client
// ---------------------------------------------------------------------------

interface StubResponse {
  /** Substring to match in the user message */
  match: string;
  /** The tool_use input to return */
  response: unknown;
}

interface StubLlmConfig {
  responses?: StubResponse[];
  /** Default response if no match found */
  defaultResponse?: unknown;
}

/**
 * Create a stub LlmClient for testing. Matches user message content
 * against configured substring patterns and returns canned tool_use responses.
 */
const ZERO_USAGE = { inputTokens: 0, outputTokens: 0 };

export function createStubLlmClient(config: StubLlmConfig): LlmClient {
  return {
    async chat() {
      return { text: '', usage: ZERO_USAGE };
    },
    async chatWithTools(_system, messages, _tools, _options): Promise<LlmToolCallResultWithUsage> {
      const userMsg = messages.find((m) => m.role === 'user')?.content ?? '';

      for (const entry of config.responses ?? []) {
        if (userMsg.includes(entry.match)) {
          return { toolName: 'extract_fields', input: entry.response, usage: ZERO_USAGE };
        }
      }

      if (config.defaultResponse !== undefined) {
        return { toolName: 'extract_fields', input: config.defaultResponse, usage: ZERO_USAGE };
      }

      return {
        toolName: 'extract_fields',
        input: { extractions: [] },
        usage: ZERO_USAGE,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

/**
 * Create a FieldDefinition with sensible defaults.
 */
export function makeFieldDefinition(
  overrides?: Partial<FieldDefinition>,
): FieldDefinition {
  return {
    key: 'company_name',
    label: 'Company Name',
    type: 'string',
    required: true,
    instructions: 'The official company name',
    ...overrides,
  };
}

/**
 * Create an ExtractedContent with sensible defaults.
 */
export function makeExtractedContent(
  overrides?: Partial<ExtractedContent>,
): ExtractedContent {
  return {
    url: 'https://example.com/about',
    title: 'About Us - Example Corp',
    metaDescription: 'Learn about Example Corp',
    headings: ['About Us', 'Our Mission'],
    bodyText:
      'Example Corp is a leading provider of enterprise software solutions. Founded in 2010, we serve over 500 customers worldwide.',
    wordCount: 20,
    fetchedAt: '2024-01-15T10:00:00Z',
    ...overrides,
  };
}

/**
 * Create a PageExtractionResult with sensible defaults.
 */
export function makePageExtractionResult(
  overrides?: Partial<PageExtractionResult>,
): PageExtractionResult {
  return {
    url: 'https://example.com/about',
    pageTitle: 'About Us - Example Corp',
    fetchedAt: '2024-01-15T10:00:00Z',
    fields: [],
    ...overrides,
  };
}

/**
 * Create a PageFieldExtraction with sensible defaults.
 */
export function makePageFieldExtraction(
  overrides?: Partial<PageFieldExtraction>,
): PageFieldExtraction {
  return {
    key: 'company_name',
    value: 'Example Corp',
    confidence: 0.95,
    snippet: 'Example Corp is a leading provider',
    ...overrides,
  };
}
