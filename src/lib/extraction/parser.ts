import type { FieldDefinition } from '../../types/domain';
import type { PageFieldExtraction } from './types';
import { createLogger } from '../logger';

const log = createLogger('extraction:parser');

interface RawExtraction {
  key?: unknown;
  value?: unknown;
  confidence?: unknown;
  snippet?: unknown;
  reason?: unknown;
}

/**
 * Coerce a raw value to the expected field type.
 * Returns undefined if the value cannot be coerced.
 */
export function coerceValue(
  value: unknown,
  field: FieldDefinition,
): unknown | undefined {
  if (value === null || value === undefined) return undefined;

  switch (field.type) {
    case 'string': {
      return typeof value === 'string' ? value : String(value);
    }
    case 'number': {
      const num = Number(value);
      return Number.isFinite(num) ? num : undefined;
    }
    case 'boolean': {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const lower = value.toLowerCase().trim();
        if (lower === 'true' || lower === 'yes') return true;
        if (lower === 'false' || lower === 'no') return false;
      }
      return undefined;
    }
    case 'enum': {
      const str = String(value).toLowerCase().trim();
      const match = field.enumOptions?.find(
        (opt) => opt.toLowerCase().trim() === str,
      );
      return match ?? undefined;
    }
    case 'string[]': {
      if (Array.isArray(value)) return value.map(String);
      if (typeof value === 'string') {
        return value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
      return undefined;
    }
    default:
      return value;
  }
}

/**
 * Check if the snippet provides evidence for the extracted value.
 * Returns a confidence penalty (0 to 0.5) if evidence is weak.
 */
function computeEvidencePenalty(value: unknown, snippet: string): number {
  const snippetLower = snippet.toLowerCase();

  // For string values, check if the value (or significant part) appears in the snippet
  if (typeof value === 'string') {
    const valueLower = value.toLowerCase().trim();

    // Direct match - no penalty
    if (snippetLower.includes(valueLower)) {
      return 0;
    }

    // Check if significant words from the value appear
    const words = valueLower.split(/\s+/).filter(w => w.length > 3);
    const matchingWords = words.filter(w => snippetLower.includes(w));
    if (matchingWords.length > 0 && matchingWords.length >= words.length * 0.5) {
      return 0.1; // Minor penalty for partial match
    }

    // Value not found in snippet - significant penalty
    return 0.4;
  }

  // For numbers, check if the number appears in the snippet
  if (typeof value === 'number') {
    const numStr = String(value);
    if (snippetLower.includes(numStr)) {
      return 0;
    }
    // Check for written numbers or ranges
    return 0.3;
  }

  // For booleans and other types, trust the LLM's assessment
  return 0;
}

/**
 * Parse the raw LLM tool_use response into validated PageFieldExtraction[].
 *
 * - Filters out fields not in the schema
 * - Skips entries with empty snippet (citation requirement)
 * - Clamps confidence to [0, 1]
 * - Penalizes confidence when snippet doesn't evidence the value
 */
export function parseExtractionResult(
  raw: unknown,
  fields: FieldDefinition[],
): PageFieldExtraction[] {
  if (!raw || typeof raw !== 'object') return [];

  const data = raw as { extractions?: unknown };
  if (!Array.isArray(data.extractions)) return [];

  const fieldMap = new Map(fields.map((f) => [f.key, f]));
  const results: PageFieldExtraction[] = [];

  for (const item of data.extractions as RawExtraction[]) {
    if (!item || typeof item !== 'object') continue;

    const key = typeof item.key === 'string' ? item.key : undefined;
    if (!key) continue;

    const field = fieldMap.get(key);
    if (!field) continue;

    const snippet =
      typeof item.snippet === 'string' ? item.snippet.trim() : '';
    if (!snippet) continue;

    const coerced = coerceValue(item.value, field);
    if (coerced === undefined) continue;

    const rawConfidence = Number(item.confidence);
    let confidence = Number.isFinite(rawConfidence)
      ? Math.max(0, Math.min(1, rawConfidence))
      : 0;

    // Apply penalty if snippet doesn't evidence the value
    const penalty = computeEvidencePenalty(coerced, snippet);
    if (penalty > 0) {
      confidence = Math.max(0, confidence - penalty);
      log.debug('Penalized confidence', { key, penalty, reason: "snippet doesn't evidence value" });
    }

    const reason =
      typeof item.reason === 'string' && item.reason.trim()
        ? item.reason.trim()
        : undefined;

    // Skip extractions with low confidence after penalty (must be at least 50%)
    if (confidence < 0.5) {
      log.debug('Skipping low confidence', { key, confidence: confidence.toFixed(2) });
      continue;
    }

    results.push({ key, value: coerced, confidence, snippet, reason });
  }

  return results;
}
