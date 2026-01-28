import type { FieldDefinition } from '@/types/domain';
import type { PageFieldExtraction } from './types';

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
 * Parse the raw LLM tool_use response into validated PageFieldExtraction[].
 *
 * - Filters out fields not in the schema
 * - Skips entries with empty snippet (citation requirement)
 * - Clamps confidence to [0, 1]
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
    const confidence = Number.isFinite(rawConfidence)
      ? Math.max(0, Math.min(1, rawConfidence))
      : 0;

    const reason =
      typeof item.reason === 'string' && item.reason.trim()
        ? item.reason.trim()
        : undefined;

    results.push({ key, value: coerced, confidence, snippet, reason });
  }

  return results;
}
