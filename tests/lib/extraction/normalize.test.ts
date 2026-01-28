import { describe, test, expect } from 'bun:test';
import {
  normalizePhone,
  normalizeCompanyName,
  normalizeAddress,
  normalizeFieldValue,
} from '@/lib/extraction/normalize';

// ---------------------------------------------------------------------------
// normalizePhone
// ---------------------------------------------------------------------------

describe('normalizePhone', () => {
  test('formats 10-digit US number', () => {
    expect(normalizePhone('5551234567')).toBe('+1 (555) 123-4567');
  });

  test('formats 11-digit US number starting with 1', () => {
    expect(normalizePhone('15551234567')).toBe('+1 (555) 123-4567');
  });

  test('handles formatted input with punctuation', () => {
    expect(normalizePhone('(555) 123-4567')).toBe('+1 (555) 123-4567');
    expect(normalizePhone('555-123-4567')).toBe('+1 (555) 123-4567');
    expect(normalizePhone('555.123.4567')).toBe('+1 (555) 123-4567');
  });

  test('passes through international numbers', () => {
    expect(normalizePhone('+44 20 7946 0958')).toBe('+44 20 7946 0958');
  });

  test('returns empty string for empty/non-string input', () => {
    expect(normalizePhone('')).toBe('');
    expect(normalizePhone(null)).toBe('');
    expect(normalizePhone(undefined)).toBe('');
    expect(normalizePhone(42 as unknown as string)).toBe('');
  });

  test('trims whitespace', () => {
    expect(normalizePhone('  5551234567  ')).toBe('+1 (555) 123-4567');
  });
});

// ---------------------------------------------------------------------------
// normalizeCompanyName
// ---------------------------------------------------------------------------

describe('normalizeCompanyName', () => {
  test('title cases company name', () => {
    expect(normalizeCompanyName('acme corp')).toBe('Acme Corp');
  });

  test('preserves Inc. suffix', () => {
    expect(normalizeCompanyName('acme inc.')).toBe('Acme Inc.');
  });

  test('preserves LLC suffix', () => {
    expect(normalizeCompanyName('acme llc')).toBe('Acme LLC');
  });

  test('preserves Ltd. suffix', () => {
    expect(normalizeCompanyName('acme ltd.')).toBe('Acme Ltd.');
  });

  test('handles already properly cased name', () => {
    expect(normalizeCompanyName('Example Corp')).toBe('Example Corp');
  });

  test('returns empty string for empty/non-string input', () => {
    expect(normalizeCompanyName('')).toBe('');
    expect(normalizeCompanyName(null)).toBe('');
    expect(normalizeCompanyName(undefined)).toBe('');
  });

  test('handles multi-word names', () => {
    expect(normalizeCompanyName('BIG DATA SOLUTIONS INC.')).toBe('Big Data Solutions Inc.');
  });
});

// ---------------------------------------------------------------------------
// normalizeAddress
// ---------------------------------------------------------------------------

describe('normalizeAddress', () => {
  test('abbreviates US state names', () => {
    expect(normalizeAddress('San Francisco, California')).toBe('San Francisco, CA');
  });

  test('abbreviates street types', () => {
    expect(normalizeAddress('123 Main Street')).toBe('123 Main St');
  });

  test('abbreviates Avenue', () => {
    expect(normalizeAddress('456 Park Avenue')).toBe('456 Park Ave');
  });

  test('abbreviates Boulevard', () => {
    expect(normalizeAddress('789 Sunset Boulevard')).toBe('789 Sunset Blvd');
  });

  test('normalizes whitespace', () => {
    expect(normalizeAddress('123  Main   Street')).toBe('123 Main St');
  });

  test('returns empty string for empty/non-string input', () => {
    expect(normalizeAddress('')).toBe('');
    expect(normalizeAddress(null)).toBe('');
  });

  test('handles full address with state and street abbreviation', () => {
    const result = normalizeAddress('123 Main Street, New York, New York 10001');
    expect(result).toContain('Main St');
    expect(result).toContain('NY');
  });
});

// ---------------------------------------------------------------------------
// normalizeFieldValue
// ---------------------------------------------------------------------------

describe('normalizeFieldValue', () => {
  test('detects phone key', () => {
    expect(normalizeFieldValue('phone', '5551234567')).toBe('+1 (555) 123-4567');
    expect(normalizeFieldValue('office_phone', '5551234567')).toBe('+1 (555) 123-4567');
    expect(normalizeFieldValue('fax', '5551234567')).toBe('+1 (555) 123-4567');
    expect(normalizeFieldValue('telephone', '5551234567')).toBe('+1 (555) 123-4567');
  });

  test('detects address key', () => {
    expect(normalizeFieldValue('address', '123 Main Street')).toBe('123 Main St');
    expect(normalizeFieldValue('office_location', '123 Main Street')).toBe('123 Main St');
  });

  test('detects company name key', () => {
    expect(normalizeFieldValue('company_name', 'acme corp')).toBe('Acme Corp');
    expect(normalizeFieldValue('companyName', 'acme corp')).toBe('Acme Corp');
  });

  test('passes through non-matching keys', () => {
    expect(normalizeFieldValue('industry', 'Technology')).toBe('Technology');
    expect(normalizeFieldValue('email', 'test@example.com')).toBe('test@example.com');
  });

  test('passes through null/undefined values', () => {
    expect(normalizeFieldValue('phone', null)).toBeNull();
    expect(normalizeFieldValue('phone', undefined)).toBeUndefined();
  });

  test('passes through non-string values', () => {
    expect(normalizeFieldValue('phone', 42)).toBe(42);
    expect(normalizeFieldValue('address', true)).toBe(true);
  });
});
