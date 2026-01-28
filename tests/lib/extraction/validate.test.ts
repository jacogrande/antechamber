import { describe, test, expect } from 'bun:test';
import {
  validateField,
  validateAllFields,
  applyValidationResults,
} from '@/lib/extraction/validate';
import type { ExtractedFieldValue } from '@/types/domain';
import { makeFieldDefinition } from './helpers';

// ---------------------------------------------------------------------------
// validateField
// ---------------------------------------------------------------------------

describe('validateField', () => {
  test('valid string passes', () => {
    const field = makeFieldDefinition({ key: 'name', type: 'string' });
    const extracted: ExtractedFieldValue = {
      key: 'name',
      value: 'Test',
      confidence: 0.9,
      citations: [],
      status: 'auto',
    };
    expect(validateField(field, extracted)).toHaveLength(0);
  });

  test('regex mismatch produces issue', () => {
    const field = makeFieldDefinition({
      key: 'email',
      type: 'string',
      validation: { regex: '^[^@]+@[^@]+\\.[^@]+$' },
    });
    const extracted: ExtractedFieldValue = {
      key: 'email',
      value: 'not-an-email',
      confidence: 0.9,
      citations: [],
      status: 'auto',
    };
    const issues = validateField(field, extracted);
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('regex');
  });

  test('regex match passes', () => {
    const field = makeFieldDefinition({
      key: 'email',
      type: 'string',
      validation: { regex: '^[^@]+@[^@]+\\.[^@]+$' },
    });
    const extracted: ExtractedFieldValue = {
      key: 'email',
      value: 'test@example.com',
      confidence: 0.9,
      citations: [],
      status: 'auto',
    };
    expect(validateField(field, extracted)).toHaveLength(0);
  });

  test('too short produces issue', () => {
    const field = makeFieldDefinition({
      key: 'name',
      type: 'string',
      validation: { minLen: 5 },
    });
    const extracted: ExtractedFieldValue = {
      key: 'name',
      value: 'AB',
      confidence: 0.9,
      citations: [],
      status: 'auto',
    };
    const issues = validateField(field, extracted);
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('minLen');
  });

  test('too long produces issue', () => {
    const field = makeFieldDefinition({
      key: 'name',
      type: 'string',
      validation: { maxLen: 3 },
    });
    const extracted: ExtractedFieldValue = {
      key: 'name',
      value: 'Too Long',
      confidence: 0.9,
      citations: [],
      status: 'auto',
    };
    const issues = validateField(field, extracted);
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('maxLen');
  });

  test('invalid enum produces issue', () => {
    const field = makeFieldDefinition({
      key: 'size',
      type: 'enum',
      enumOptions: ['Small', 'Medium', 'Large'],
    });
    const extracted: ExtractedFieldValue = {
      key: 'size',
      value: 'Huge',
      confidence: 0.9,
      citations: [],
      status: 'auto',
    };
    const issues = validateField(field, extracted);
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('enum');
  });

  test('valid enum passes (case-insensitive)', () => {
    const field = makeFieldDefinition({
      key: 'size',
      type: 'enum',
      enumOptions: ['Small', 'Medium', 'Large'],
    });
    const extracted: ExtractedFieldValue = {
      key: 'size',
      value: 'small',
      confidence: 0.9,
      citations: [],
      status: 'auto',
    };
    expect(validateField(field, extracted)).toHaveLength(0);
  });

  test('type mismatch: expected string, got number', () => {
    const field = makeFieldDefinition({ key: 'name', type: 'string' });
    const extracted: ExtractedFieldValue = {
      key: 'name',
      value: 42,
      confidence: 0.9,
      citations: [],
      status: 'auto',
    };
    const issues = validateField(field, extracted);
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('type');
  });

  test('type mismatch: expected number, got string', () => {
    const field = makeFieldDefinition({ key: 'count', type: 'number' });
    const extracted: ExtractedFieldValue = {
      key: 'count',
      value: 'not a number',
      confidence: 0.9,
      citations: [],
      status: 'auto',
    };
    const issues = validateField(field, extracted);
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('type');
  });

  test('type mismatch: expected boolean', () => {
    const field = makeFieldDefinition({ key: 'active', type: 'boolean' });
    const extracted: ExtractedFieldValue = {
      key: 'active',
      value: 'yes',
      confidence: 0.9,
      citations: [],
      status: 'auto',
    };
    const issues = validateField(field, extracted);
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('type');
  });

  test('type mismatch: expected string[]', () => {
    const field = makeFieldDefinition({ key: 'tags', type: 'string[]' });
    const extracted: ExtractedFieldValue = {
      key: 'tags',
      value: 'not an array',
      confidence: 0.9,
      citations: [],
      status: 'auto',
    };
    const issues = validateField(field, extracted);
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('type');
  });

  test('skips validation for unknown status', () => {
    const field = makeFieldDefinition({ key: 'name', type: 'string', validation: { minLen: 100 } });
    const extracted: ExtractedFieldValue = {
      key: 'name',
      value: null,
      confidence: 0,
      citations: [],
      status: 'unknown',
    };
    expect(validateField(field, extracted)).toHaveLength(0);
  });

  test('skips validation for null value', () => {
    const field = makeFieldDefinition({ key: 'name', type: 'string', validation: { minLen: 100 } });
    const extracted: ExtractedFieldValue = {
      key: 'name',
      value: null,
      confidence: 0.5,
      citations: [],
      status: 'needs_review',
    };
    expect(validateField(field, extracted)).toHaveLength(0);
  });

  test('invalid regex in field definition is handled gracefully', () => {
    const field = makeFieldDefinition({
      key: 'name',
      type: 'string',
      validation: { regex: '[invalid(' },
    });
    const extracted: ExtractedFieldValue = {
      key: 'name',
      value: 'Test',
      confidence: 0.9,
      citations: [],
      status: 'auto',
    };
    // Should not throw, should skip the regex check
    expect(validateField(field, extracted)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// validateAllFields
// ---------------------------------------------------------------------------

describe('validateAllFields', () => {
  test('aggregates issues across fields', () => {
    const fields = [
      makeFieldDefinition({ key: 'email', type: 'string', validation: { regex: '@' } }),
      makeFieldDefinition({ key: 'name', type: 'string', validation: { minLen: 10 } }),
    ];
    const extracted: ExtractedFieldValue[] = [
      { key: 'email', value: 'bad', confidence: 0.9, citations: [], status: 'auto' },
      { key: 'name', value: 'Hi', confidence: 0.9, citations: [], status: 'auto' },
    ];
    const issues = validateAllFields(fields, extracted);
    expect(issues).toHaveLength(2);
    expect(issues.map((i) => i.key)).toContain('email');
    expect(issues.map((i) => i.key)).toContain('name');
  });

  test('skips fields not in schema', () => {
    const fields = [makeFieldDefinition({ key: 'name', type: 'string' })];
    const extracted: ExtractedFieldValue[] = [
      { key: 'unknown_field', value: 'test', confidence: 0.9, citations: [], status: 'auto' },
    ];
    expect(validateAllFields(fields, extracted)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// applyValidationResults
// ---------------------------------------------------------------------------

describe('applyValidationResults', () => {
  test('demotes field to needs_review with validation issue', () => {
    const extracted: ExtractedFieldValue[] = [
      { key: 'email', value: 'bad', confidence: 0.9, citations: [], status: 'auto' },
    ];
    const issues = [{ key: 'email', type: 'regex' as const, message: 'Does not match pattern' }];

    const result = applyValidationResults(extracted, issues);
    expect(result[0].status).toBe('needs_review');
    expect(result[0].reason).toContain('Does not match pattern');
  });

  test('preserves existing reason when adding validation reason', () => {
    const extracted: ExtractedFieldValue[] = [
      {
        key: 'email',
        value: 'bad',
        confidence: 0.5,
        citations: [],
        status: 'needs_review',
        reason: 'Low confidence',
      },
    ];
    const issues = [{ key: 'email', type: 'regex' as const, message: 'Pattern mismatch' }];

    const result = applyValidationResults(extracted, issues);
    expect(result[0].reason).toContain('Low confidence');
    expect(result[0].reason).toContain('Pattern mismatch');
  });

  test('does not modify fields without issues', () => {
    const extracted: ExtractedFieldValue[] = [
      { key: 'name', value: 'Test', confidence: 0.9, citations: [], status: 'auto' },
    ];
    const result = applyValidationResults(extracted, []);
    expect(result[0].status).toBe('auto');
    expect(result[0]).toBe(extracted[0]); // Same reference
  });

  test('aggregates multiple issues for same field', () => {
    const extracted: ExtractedFieldValue[] = [
      { key: 'name', value: 'X', confidence: 0.9, citations: [], status: 'auto' },
    ];
    const issues = [
      { key: 'name', type: 'minLen' as const, message: 'Too short' },
      { key: 'name', type: 'regex' as const, message: 'Bad format' },
    ];

    const result = applyValidationResults(extracted, issues);
    expect(result[0].reason).toContain('Too short');
    expect(result[0].reason).toContain('Bad format');
  });
});
