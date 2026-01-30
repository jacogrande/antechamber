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

  console.log(`[extraction] Starting extraction for ${input.fields.length} fields from ${input.pages.length} pages`);
  console.log(`[extraction] Fields: ${input.fields.map(f => f.key).join(', ')}`);

  // 1. Per-page LLM extraction (bounded concurrency)
  const pageResults: PageExtractionResult[] = [];
  const batches = chunk(input.pages, cfg.extractionConcurrency);
  console.log(`[extraction] Processing ${batches.length} batches (concurrency: ${cfg.extractionConcurrency})`);

  let batchNum = 0;
  for (const batch of batches) {
    batchNum++;
    console.log(`[extraction] Processing batch ${batchNum}/${batches.length} (${batch.length} pages)`);
    const batchStart = Date.now();
    const batchResults = await Promise.all(
      batch.map((page) =>
        extractFieldsFromPage(page, input.fields, llmClient, config),
      ),
    );
    const batchTime = Date.now() - batchStart;
    console.log(`[extraction] Batch ${batchNum} complete in ${batchTime}ms`);
    pageResults.push(...batchResults);
  }

  // 2. Deterministic synthesis/merge
  console.log('[extraction] Synthesizing results from all pages...');
  let synthesized = synthesizeFields(input.fields, pageResults, config);
  const foundCount = synthesized.filter(f => f.confidence > 0 && f.value !== null).length;
  console.log(`[extraction] Synthesis complete: ${foundCount}/${synthesized.length} fields have values`);

  // 3. Normalization
  console.log('[extraction] Normalizing field values...');
  synthesized = synthesized.map((f) => ({
    ...f,
    value: normalizeFieldValue(f.key, f.value),
  }));

  // 4. Schema constraint validation
  console.log('[extraction] Validating against schema constraints...');
  const issues = validateAllFields(input.fields, synthesized);
  if (issues.length > 0) {
    console.log(`[extraction] Found ${issues.length} validation issues`);
  }
  synthesized = applyValidationResults(synthesized, issues);

  console.log('[extraction] Extraction pipeline complete');
  return { fields: synthesized, pageResults };
}
