import type { LlmClient, ExtractionConfig, ExtractionInput, ExtractionOutput, PageExtractionResult } from './types';
import { DEFAULT_EXTRACTION_CONFIG } from './types';
import { extractFieldsFromPage } from './page-extractor';
import { synthesizeFields } from './synthesis';
import { normalizeFieldValue } from './normalize';
import { validateAllFields, applyValidationResults } from './validate';

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

  // 1. Per-page LLM extraction (bounded concurrency)
  const pageResults: PageExtractionResult[] = [];
  const batches = chunk(input.pages, cfg.extractionConcurrency);
  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map((page) =>
        extractFieldsFromPage(page, input.fields, llmClient, config),
      ),
    );
    pageResults.push(...batchResults);
  }

  // 2. Deterministic synthesis/merge
  let synthesized = synthesizeFields(input.fields, pageResults, config);

  // 3. Normalization
  synthesized = synthesized.map((f) => ({
    ...f,
    value: normalizeFieldValue(f.key, f.value),
  }));

  // 4. Schema constraint validation
  const issues = validateAllFields(input.fields, synthesized);
  synthesized = applyValidationResults(synthesized, issues);

  return { fields: synthesized, pageResults };
}
