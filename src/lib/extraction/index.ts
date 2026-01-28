// Public API
export { extractAndSynthesize } from './facade';
export { createAnthropicClient } from './llm-client';

// Types
export type {
  LlmClient,
  LlmToolDefinition,
  LlmToolCallResult,
  ExtractionConfig,
  ExtractionInput,
  ExtractionOutput,
  PageExtractionResult,
  PageFieldExtraction,
  MergeCandidate,
  FieldMergeBucket,
  ValueGroup,
  ValidationIssue,
} from './types';
export { DEFAULT_EXTRACTION_CONFIG, DEFAULT_MODEL } from './types';

// @internal — exported for advanced usage and testing
export { extractFieldsFromPage } from './page-extractor';
export { synthesizeFields, buildMergeBuckets, mergeField, groupByValue, selectBestGroup, checkSourceHintMatch } from './synthesis';
export { normalizePhone, normalizeCompanyName, normalizeAddress, normalizeFieldValue } from './normalize';
export { validateField, validateAllFields, applyValidationResults } from './validate';
export { buildSystemPrompt, buildUserMessage, buildExtractionTool, truncateText } from './prompt';
export { parseExtractionResult, coerceValue } from './parser';
