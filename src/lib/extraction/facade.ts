import type { LlmClient, ExtractionConfig, ExtractionInput, ExtractionOutput, PageExtractionResult } from './types';
import { DEFAULT_EXTRACTION_CONFIG } from './types';
import { extractFieldsFromPage } from './page-extractor';
import { synthesizeFields } from './synthesis';
import { normalizeFieldValue } from './normalize';
import { validateAllFields, applyValidationResults } from './validate';
import { createLogger } from '../logger';

const log = createLogger('extraction');

/**
 * Split an array into chunks of at most `size` elements.
 */
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * The single public entry point for LLM extraction and synthesis.
 *
 * Pipeline:
 *   1. Per-page LLM extraction (parallel)
 *   2. Deterministic synthesis/merge
 *   3. Normalization (phone, address, company name)
 *   4. Schema constraint validation
 */
export async function extractAndSynthesize(
  input: ExtractionInput,
  llmClient: LlmClient,
  config?: ExtractionConfig,
): Promise<ExtractionOutput> {
  const cfg = { ...DEFAULT_EXTRACTION_CONFIG, ...config };

  log.info('Starting extraction', { fieldCount: input.fields.length, pageCount: input.pages.length });
  log.debug('Fields', { keys: input.fields.map(f => f.key) });

  // 1. Per-page LLM extraction (bounded concurrency)
  const pageResults: PageExtractionResult[] = [];
  const batches = chunk(input.pages, cfg.extractionConcurrency);
  log.debug('Processing batches', { batchCount: batches.length, concurrency: cfg.extractionConcurrency });

  let batchNum = 0;
  for (const batch of batches) {
    batchNum++;
    log.debug('Processing batch', { batch: batchNum, total: batches.length, pages: batch.length });
    const batchStart = Date.now();
    const batchResults = await Promise.all(
      batch.map((page) =>
        extractFieldsFromPage(page, input.fields, llmClient, config),
      ),
    );
    const batchTime = Date.now() - batchStart;
    log.debug('Batch complete', { batch: batchNum, elapsed: batchTime });
    pageResults.push(...batchResults);
  }

  // 2. Deterministic synthesis/merge
  log.debug('Synthesizing results from all pages...');
  let synthesized = synthesizeFields(input.fields, pageResults, config);
  const foundCount = synthesized.filter(f => f.confidence > 0 && f.value !== null).length;
  log.info('Synthesis complete', { found: foundCount, total: synthesized.length });

  // 3. Normalization
  log.debug('Normalizing field values...');
  synthesized = synthesized.map((f) => ({
    ...f,
    value: normalizeFieldValue(f.key, f.value),
  }));

  // 4. Schema constraint validation
  log.debug('Validating against schema constraints...');
  const issues = validateAllFields(input.fields, synthesized);
  if (issues.length > 0) {
    log.info('Validation issues found', { count: issues.length });
  }
  synthesized = applyValidationResults(synthesized, issues);

  log.info('Extraction pipeline complete');
  return { fields: synthesized, pageResults };
}
