import type { FieldDefinition, ExtractedFieldValue, Citation } from '../../types/domain';
import type {
  ExtractionConfig,
  PageExtractionResult,
  MergeCandidate,
  FieldMergeBucket,
  ValueGroup,
} from './types';
import { DEFAULT_EXTRACTION_CONFIG } from './types';

/**
 * Check if a URL contains any of the source hint keywords (case-insensitive).
 */
export function checkSourceHintMatch(
  url: string,
  sourceHints?: string[],
): boolean {
  if (!sourceHints?.length) return false;
  const lower = url.toLowerCase();
  return sourceHints.some((hint) => lower.includes(hint.toLowerCase()));
}

/**
 * Normalize a value to a lowercase trimmed string for comparison.
 */
function normalizeForComparison(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) {
    return value
      .map((v) => String(v).toLowerCase().trim())
      .sort()
      .join(',');
  }
  return String(value).toLowerCase().trim();
}

/**
 * Group merge candidates by their normalized value.
 */
export function groupByValue(candidates: MergeCandidate[]): ValueGroup[] {
  const groups = new Map<string, MergeCandidate[]>();

  for (const candidate of candidates) {
    const norm = normalizeForComparison(candidate.value);
    const existing = groups.get(norm);
    if (existing) {
      existing.push(candidate);
    } else {
      groups.set(norm, [candidate]);
    }
  }

  return Array.from(groups.entries()).map(([normalizedValue, cands]) => ({
    normalizedValue,
    candidates: cands,
    totalConfidence: cands.reduce((sum, c) => sum + c.confidence, 0),
  }));
}

/**
 * Select the best value group: highest total confidence, then most citations as tiebreaker.
 */
export function selectBestGroup(groups: ValueGroup[]): ValueGroup {
  return groups.sort((a, b) => {
    if (b.totalConfidence !== a.totalConfidence) {
      return b.totalConfidence - a.totalConfidence;
    }
    return b.candidates.length - a.candidates.length;
  })[0];
}

/**
 * Build merge buckets: one per field, grouping per-page extractions with citations.
 */
export function buildMergeBuckets(
  fields: FieldDefinition[],
  pageResults: PageExtractionResult[],
  config?: ExtractionConfig,
): Map<string, FieldMergeBucket> {
  const cfg = { ...DEFAULT_EXTRACTION_CONFIG, ...config };
  const buckets = new Map<string, FieldMergeBucket>();

  for (const field of fields) {
    buckets.set(field.key, { key: field.key, candidates: [] });
  }

  for (const page of pageResults) {
    for (const extraction of page.fields) {
      const bucket = buckets.get(extraction.key);
      if (!bucket) continue;

      const field = fields.find((f) => f.key === extraction.key);
      const isHintMatch = field
        ? checkSourceHintMatch(page.url, field.sourceHints)
        : false;

      let confidence = extraction.confidence;
      if (isHintMatch) {
        confidence = Math.min(1, confidence + cfg.sourceHintBoost);
      }

      const citation: Citation = {
        url: page.url,
        snippet: extraction.snippet,
        pageTitle: page.pageTitle || undefined,
        retrievedAt: page.fetchedAt,
      };

      bucket.candidates.push({
        value: extraction.value,
        confidence,
        citation,
        reason: extraction.reason,
        sourceHintMatch: isHintMatch,
      });
    }
  }

  return buckets;
}

/**
 * Merge candidates for a single field into an ExtractedFieldValue.
 */
export function mergeField(
  field: FieldDefinition,
  bucket: FieldMergeBucket,
  config?: ExtractionConfig,
): ExtractedFieldValue {
  const cfg = { ...DEFAULT_EXTRACTION_CONFIG, ...config };
  const threshold = field.confidenceThreshold ?? cfg.defaultConfidenceThreshold;

  if (bucket.candidates.length === 0) {
    return {
      key: field.key,
      value: null,
      confidence: 0,
      citations: [],
      status: 'unknown',
    };
  }

  const groups = groupByValue(bucket.candidates);
  const hasConflict = groups.length > 1;
  const best = selectBestGroup(groups);

  const value = best.candidates[0].value;
  const citations = best.candidates.map((c) => c.citation);
  const maxConfidence = Math.max(...best.candidates.map((c) => c.confidence));
  const confidence = Math.min(
    1,
    maxConfidence + cfg.corroborationBoost * (best.candidates.length - 1),
  );

  if (hasConflict) {
    const conflictValues = groups
      .map((g) => `"${g.candidates[0].value}"`)
      .join(' vs ');
    return {
      key: field.key,
      value,
      confidence,
      citations,
      status: 'needs_review',
      reason: `Conflicting values found: ${conflictValues}`,
    };
  }

  const status = confidence >= threshold ? 'auto' : 'needs_review';
  const result: ExtractedFieldValue = {
    key: field.key,
    value,
    confidence,
    citations,
    status,
  };

  if (status === 'needs_review') {
    result.reason = `Confidence ${confidence.toFixed(2)} below threshold ${threshold}`;
  }

  return result;
}

/**
 * Synthesize per-page extraction results into final ExtractedFieldValues.
 */
export function synthesizeFields(
  fields: FieldDefinition[],
  pageResults: PageExtractionResult[],
  config?: ExtractionConfig,
): ExtractedFieldValue[] {
  const buckets = buildMergeBuckets(fields, pageResults, config);

  return fields.map((field) => {
    const bucket = buckets.get(field.key);
    if (!bucket) {
      throw new Error(
        `synthesizeFields: no merge bucket found for field "${field.key}". ` +
        `This is a bug — buildMergeBuckets should create a bucket for every field.`,
      );
    }
    return mergeField(field, bucket, config);
  });
}
