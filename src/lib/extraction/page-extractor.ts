import type { FieldDefinition } from '../../types/domain';
import type { ExtractedContent } from '../crawl/types';
import type {
  LlmClient,
  ExtractionConfig,
  PageExtractionResult,
} from './types';
import { DEFAULT_EXTRACTION_CONFIG } from './types';
import {
  buildSystemPrompt,
  buildUserMessage,
  buildExtractionTool,
} from './prompt';
import { parseExtractionResult } from './parser';
import { createLogger } from '../logger';

const log = createLogger('extraction:llm');

/**
 * Extract fields from a single page using the LLM.
 * Skips pages with fewer than cfg.minWordCount words.
 */
export async function extractFieldsFromPage(
  page: ExtractedContent,
  fields: FieldDefinition[],
  llmClient: LlmClient,
  config?: ExtractionConfig,
): Promise<PageExtractionResult> {
  const cfg = { ...DEFAULT_EXTRACTION_CONFIG, ...config };

  if (page.wordCount < cfg.minWordCount) {
    log.debug('Skipping page (too few words)', { url: page.url, wordCount: page.wordCount, minWordCount: cfg.minWordCount });
    return {
      url: page.url,
      pageTitle: page.title,
      fetchedAt: page.fetchedAt,
      fields: [],
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }

  log.debug('Extracting from page', { url: page.url, wordCount: page.wordCount });
  const llmStart = Date.now();

  const system = buildSystemPrompt();
  const userMessage = buildUserMessage(fields, page, { maxBodyChars: cfg.maxBodyChars });
  const tool = buildExtractionTool(fields);

  const result = await llmClient.chatWithTools(
    system,
    [{ role: 'user', content: userMessage }],
    [tool],
    {
      model: cfg.model,
      maxTokens: cfg.maxTokens,
      temperature: cfg.temperature,
      toolChoice: { type: 'tool', name: tool.name },
    },
  );

  const llmTime = Date.now() - llmStart;
  const parsed = parseExtractionResult(result.input, fields);
  const foundFields = parsed.filter(f => f.confidence > 0).length;
  log.info('LLM response', { url: page.url, elapsed: llmTime, found: foundFields, total: fields.length });

  return {
    url: page.url,
    pageTitle: page.title,
    fetchedAt: page.fetchedAt,
    fields: parsed,
    usage: result.usage,
  };
}
