import type {
  FieldDefinition,
  Citation,
  ExtractedFieldValue,
} from '../../types/domain';
import type { ExtractedContent } from '../crawl/types';

// ---------------------------------------------------------------------------
// LLM Client Interface (injectable — stub in tests, Anthropic in prod)
// ---------------------------------------------------------------------------

export interface LlmToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface LlmToolCallResult {
  toolName: string;
  input: unknown;
}

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface LlmChatResult {
  text: string;
  usage: LlmUsage;
}

export interface LlmToolCallResultWithUsage extends LlmToolCallResult {
  usage: LlmUsage;
}

export interface LlmClient {
  chat(
    system: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: { model?: string; maxTokens?: number; temperature?: number },
  ): Promise<LlmChatResult>;

  chatWithTools(
    system: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    tools: LlmToolDefinition[],
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      toolChoice?: { type: 'tool'; name: string };
    },
  ): Promise<LlmToolCallResultWithUsage>;
}

// ---------------------------------------------------------------------------
// Per-page extraction (internal, before synthesis)
// ---------------------------------------------------------------------------

export interface PageFieldExtraction {
  key: string;
  value: unknown;
  confidence: number;
  snippet: string;
  reason?: string;
}

export interface PageExtractionResult {
  url: string;
  pageTitle: string;
  fetchedAt: string;
  fields: PageFieldExtraction[];
  usage?: LlmUsage;
}

// ---------------------------------------------------------------------------
// Synthesis intermediaries
// ---------------------------------------------------------------------------

export interface MergeCandidate {
  value: unknown;
  confidence: number;
  citation: Citation;
  reason?: string;
  sourceHintMatch: boolean;
}

export interface FieldMergeBucket {
  key: string;
  candidates: MergeCandidate[];
}

export interface ValueGroup {
  normalizedValue: string;
  candidates: MergeCandidate[];
  totalConfidence: number;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

export interface ExtractionConfig {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  sourceHintBoost?: number;
  defaultConfidenceThreshold?: number;
  extractionConcurrency?: number;
  corroborationBoost?: number;
  maxBodyChars?: number;
  minWordCount?: number;
}

export const DEFAULT_EXTRACTION_CONFIG: Required<ExtractionConfig> = {
  model: DEFAULT_MODEL,
  maxTokens: 4096,
  temperature: 0,
  sourceHintBoost: 0.15,
  defaultConfidenceThreshold: 0.75,
  extractionConcurrency: 5,
  corroborationBoost: 0.1,
  maxBodyChars: 12_000,
  minWordCount: 10,
};

// ---------------------------------------------------------------------------
// Facade I/O
// ---------------------------------------------------------------------------

export interface ExtractionInput {
  fields: FieldDefinition[];
  pages: ExtractedContent[];
}

export interface ExtractionOutput {
  fields: ExtractedFieldValue[];
  pageResults: PageExtractionResult[];
  usage: LlmUsage;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ValidationIssue {
  key: string;
  type: 'regex' | 'minLen' | 'maxLen' | 'enum' | 'type';
  message: string;
}

// Re-export domain types used by consumers
export type {
  FieldDefinition,
  Citation,
  ExtractedFieldValue,
  FieldStatus,
  FieldType,
} from '../../types/domain';
export type { ExtractedContent } from '../crawl/types';
