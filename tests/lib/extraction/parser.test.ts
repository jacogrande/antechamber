import { describe, test, expect } from 'bun:test';
import { parseExtractionResult, coerceValue } from '@/lib/extraction/parser';
import { makeFieldDefinition } from './helpers';
import basicResponse from './fixtures/llm-response-basic.json';
import multiFieldResponse from './fixtures/llm-response-multi-field.json';
import partialResponse from './fixtures/llm-response-partial.json';
import malformedResponse from './fixtures/llm-response-malformed.json';

describe('coerceValue', () => {
  test('string type: passes through strings', () => {
    const field = makeFieldDefinition({ type: 'string' });
    expect(coerceValue('hello', field)).toBe('hello');
  });

  test('string type: converts non-strings to string', () => {
    const field = makeFieldDefinition({ type: 'string' });
    expect(coerceValue(42, field)).toBe('42');
  });

  test('number type: converts valid number', () => {
    const field = makeFieldDefinition({ type: 'number' });
    expect(coerceValue(42, field)).toBe(42);
    expect(coerceValue('42', field)).toBe(42);
  });

  test('number type: returns undefined for non-finite', () => {
    const field = makeFieldDefinition({ type: 'number' });
    expect(coerceValue('not a number', field)).toBeUndefined();
    expect(coerceValue(NaN, field)).toBeUndefined();
    expect(coerceValue(Infinity, field)).toBeUndefined();
  });

  test('boolean type: handles booleans', () => {
    const field = makeFieldDefinition({ type: 'boolean' });
    expect(coerceValue(true, field)).toBe(true);
    expect(coerceValue(false, field)).toBe(false);
  });

  test('boolean type: handles string true/yes/false/no', () => {
    const field = makeFieldDefinition({ type: 'boolean' });
    expect(coerceValue('true', field)).toBe(true);
    expect(coerceValue('yes', field)).toBe(true);
    expect(coerceValue('True', field)).toBe(true);
    expect(coerceValue('false', field)).toBe(false);
    expect(coerceValue('no', field)).toBe(false);
    expect(coerceValue('No', field)).toBe(false);
  });

  test('boolean type: returns undefined for unrecognized strings', () => {
    const field = makeFieldDefinition({ type: 'boolean' });
    expect(coerceValue('maybe', field)).toBeUndefined();
  });

  test('enum type: case-insensitive match', () => {
    const field = makeFieldDefinition({
      type: 'enum',
      enumOptions: ['Small', 'Medium', 'Large'],
    });
    expect(coerceValue('small', field)).toBe('Small');
    expect(coerceValue('MEDIUM', field)).toBe('Medium');
    expect(coerceValue('Large', field)).toBe('Large');
  });

  test('enum type: returns undefined for non-matching value', () => {
    const field = makeFieldDefinition({
      type: 'enum',
      enumOptions: ['Small', 'Medium', 'Large'],
    });
    expect(coerceValue('Huge', field)).toBeUndefined();
  });

  test('string[] type: passes through arrays', () => {
    const field = makeFieldDefinition({ type: 'string[]' });
    expect(coerceValue(['a', 'b'], field)).toEqual(['a', 'b']);
  });

  test('string[] type: converts array elements to strings', () => {
    const field = makeFieldDefinition({ type: 'string[]' });
    expect(coerceValue([1, 2, 3], field)).toEqual(['1', '2', '3']);
  });

  test('string[] type: splits comma-separated string', () => {
    const field = makeFieldDefinition({ type: 'string[]' });
    expect(coerceValue('a, b, c', field)).toEqual(['a', 'b', 'c']);
  });

  test('string[] type: filters empty segments', () => {
    const field = makeFieldDefinition({ type: 'string[]' });
    expect(coerceValue('a,,b', field)).toEqual(['a', 'b']);
  });

  test('returns undefined for null/undefined', () => {
    const field = makeFieldDefinition({ type: 'string' });
    expect(coerceValue(null, field)).toBeUndefined();
    expect(coerceValue(undefined, field)).toBeUndefined();
  });
});

describe('parseExtractionResult', () => {
  const fields = [
    makeFieldDefinition({ key: 'company_name', type: 'string' }),
    makeFieldDefinition({ key: 'industry', type: 'string' }),
  ];

  test('parses well-formed basic response', () => {
    const result = parseExtractionResult(basicResponse, fields);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe('company_name');
    expect(result[0].value).toBe('Example Corp');
    expect(result[0].confidence).toBe(0.95);
    expect(result[0].snippet).toContain('Example Corp');
    expect(result[1].key).toBe('industry');
  });

  test('filters out fields not in schema', () => {
    const singleField = [makeFieldDefinition({ key: 'company_name', type: 'string' })];
    const result = parseExtractionResult(basicResponse, singleField);
    // industry should be filtered out
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('company_name');
  });

  test('skips entries with empty snippet', () => {
    const raw = {
      extractions: [
        { key: 'company_name', value: 'Test', confidence: 0.9, snippet: '' },
        { key: 'company_name', value: 'Test', confidence: 0.9, snippet: '   ' },
      ],
    };
    const result = parseExtractionResult(raw, fields);
    expect(result).toHaveLength(0);
  });

  test('clamps confidence to [0, 1]', () => {
    const raw = {
      extractions: [
        { key: 'company_name', value: 'Test', confidence: 1.5, snippet: 'evidence' },
        { key: 'industry', value: 'Tech', confidence: -0.5, snippet: 'evidence' },
      ],
    };
    const result = parseExtractionResult(raw, fields);
    expect(result[0].confidence).toBe(1);
    expect(result[1].confidence).toBe(0);
  });

  test('preserves reason when present', () => {
    const result = parseExtractionResult(partialResponse, fields);
    expect(result[0].reason).toBeDefined();
    expect(result[0].reason!.length).toBeGreaterThan(0);
  });

  test('handles malformed input gracefully', () => {
    const result = parseExtractionResult(malformedResponse, fields);
    expect(result).toHaveLength(0);
  });

  test('handles null input', () => {
    expect(parseExtractionResult(null, fields)).toEqual([]);
  });

  test('handles undefined input', () => {
    expect(parseExtractionResult(undefined, fields)).toEqual([]);
  });

  test('handles non-object input', () => {
    expect(parseExtractionResult('string', fields)).toEqual([]);
    expect(parseExtractionResult(42, fields)).toEqual([]);
  });

  test('handles extractions with missing key', () => {
    const raw = {
      extractions: [
        { value: 'Test', confidence: 0.9, snippet: 'evidence' },
      ],
    };
    expect(parseExtractionResult(raw, fields)).toHaveLength(0);
  });

  test('handles non-finite confidence gracefully', () => {
    const raw = {
      extractions: [
        { key: 'company_name', value: 'Test', confidence: 'high', snippet: 'evidence' },
      ],
    };
    const result = parseExtractionResult(raw, fields);
    expect(result[0].confidence).toBe(0);
  });

  test('confidence exactly 0 is preserved', () => {
    const raw = {
      extractions: [
        { key: 'company_name', value: 'Test', confidence: 0, snippet: 'evidence' },
      ],
    };
    const result = parseExtractionResult(raw, fields);
    expect(result[0].confidence).toBe(0);
  });

  test('confidence exactly 1 is preserved', () => {
    const raw = {
      extractions: [
        { key: 'company_name', value: 'Test', confidence: 1, snippet: 'evidence' },
      ],
    };
    const result = parseExtractionResult(raw, fields);
    expect(result[0].confidence).toBe(1);
  });

  test('confidence just above 1 is clamped to 1', () => {
    const raw = {
      extractions: [
        { key: 'company_name', value: 'Test', confidence: 1.01, snippet: 'evidence' },
      ],
    };
    const result = parseExtractionResult(raw, fields);
    expect(result[0].confidence).toBe(1);
  });

  test('confidence just below 0 is clamped to 0', () => {
    const raw = {
      extractions: [
        { key: 'company_name', value: 'Test', confidence: -0.01, snippet: 'evidence' },
      ],
    };
    const result = parseExtractionResult(raw, fields);
    expect(result[0].confidence).toBe(0);
  });
});
