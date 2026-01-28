import { describe, test, expect } from 'bun:test';
import {
  synthesizeFields,
  buildMergeBuckets,
  mergeField,
  groupByValue,
  selectBestGroup,
  checkSourceHintMatch,
} from '@/lib/extraction/synthesis';
import type { FieldMergeBucket, MergeCandidate } from '@/lib/extraction/types';
import {
  makeFieldDefinition,
  makePageExtractionResult,
  makePageFieldExtraction,
} from './helpers';

// ---------------------------------------------------------------------------
// checkSourceHintMatch
// ---------------------------------------------------------------------------

describe('checkSourceHintMatch', () => {
  test('returns true if URL contains hint keyword', () => {
    expect(checkSourceHintMatch('https://example.com/about-us', ['about'])).toBe(true);
  });

  test('is case-insensitive', () => {
    expect(checkSourceHintMatch('https://example.com/ABOUT', ['about'])).toBe(true);
  });

  test('returns false if no hints match', () => {
    expect(checkSourceHintMatch('https://example.com/pricing', ['about'])).toBe(false);
  });

  test('returns false for empty/undefined hints', () => {
    expect(checkSourceHintMatch('https://example.com/about', undefined)).toBe(false);
    expect(checkSourceHintMatch('https://example.com/about', [])).toBe(false);
  });

  test('matches any hint in array', () => {
    expect(
      checkSourceHintMatch('https://example.com/contact', ['about', 'contact']),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// groupByValue
// ---------------------------------------------------------------------------

describe('groupByValue', () => {
  const makeCand = (value: unknown, confidence: number): MergeCandidate => ({
    value,
    confidence,
    citation: { url: 'https://x.com', snippet: 's', retrievedAt: '2024-01-01T00:00:00Z' },
    sourceHintMatch: false,
  });

  test('groups identical values (case-insensitive)', () => {
    const candidates = [
      makeCand('Acme Corp', 0.9),
      makeCand('acme corp', 0.8),
    ];
    const groups = groupByValue(candidates);
    expect(groups).toHaveLength(1);
    expect(groups[0].candidates).toHaveLength(2);
  });

  test('separates different values', () => {
    const candidates = [
      makeCand('Acme Corp', 0.9),
      makeCand('Acme Corporation', 0.8),
    ];
    const groups = groupByValue(candidates);
    expect(groups).toHaveLength(2);
  });

  test('computes totalConfidence', () => {
    const candidates = [
      makeCand('Acme Corp', 0.5),
      makeCand('acme corp', 0.3),
    ];
    const groups = groupByValue(candidates);
    expect(groups[0].totalConfidence).toBeCloseTo(0.8);
  });
});

// ---------------------------------------------------------------------------
// selectBestGroup
// ---------------------------------------------------------------------------

describe('selectBestGroup', () => {
  test('selects group with highest total confidence', () => {
    const groups = [
      { normalizedValue: 'a', candidates: [] as MergeCandidate[], totalConfidence: 0.5 },
      { normalizedValue: 'b', candidates: [] as MergeCandidate[], totalConfidence: 0.9 },
    ];
    expect(selectBestGroup(groups).normalizedValue).toBe('b');
  });

  test('uses candidate count as tiebreaker', () => {
    const makeCand = (): MergeCandidate => ({
      value: 'x',
      confidence: 0.5,
      citation: { url: 'https://x.com', snippet: 's', retrievedAt: '2024-01-01T00:00:00Z' },
      sourceHintMatch: false,
    });
    const groups = [
      { normalizedValue: 'a', candidates: [makeCand()], totalConfidence: 0.9 },
      { normalizedValue: 'b', candidates: [makeCand(), makeCand()], totalConfidence: 0.9 },
    ];
    expect(selectBestGroup(groups).normalizedValue).toBe('b');
  });
});

// ---------------------------------------------------------------------------
// buildMergeBuckets
// ---------------------------------------------------------------------------

describe('buildMergeBuckets', () => {
  test('creates a bucket per field', () => {
    const fields = [
      makeFieldDefinition({ key: 'name' }),
      makeFieldDefinition({ key: 'phone' }),
    ];
    const buckets = buildMergeBuckets(fields, []);
    expect(buckets.size).toBe(2);
    expect(buckets.has('name')).toBe(true);
    expect(buckets.has('phone')).toBe(true);
  });

  test('populates candidates from page results', () => {
    const fields = [makeFieldDefinition({ key: 'company_name' })];
    const pageResults = [
      makePageExtractionResult({
        url: 'https://example.com/about',
        fields: [makePageFieldExtraction({ key: 'company_name', value: 'Test', confidence: 0.9 })],
      }),
    ];
    const buckets = buildMergeBuckets(fields, pageResults);
    expect(buckets.get('company_name')!.candidates).toHaveLength(1);
    expect(buckets.get('company_name')!.candidates[0].confidence).toBe(0.9);
  });

  test('applies sourceHints boost', () => {
    const fields = [
      makeFieldDefinition({ key: 'company_name', sourceHints: ['about'] }),
    ];
    const pageResults = [
      makePageExtractionResult({
        url: 'https://example.com/about',
        fields: [makePageFieldExtraction({ key: 'company_name', confidence: 0.8 })],
      }),
    ];
    const buckets = buildMergeBuckets(fields, pageResults, { sourceHintBoost: 0.15 });
    expect(buckets.get('company_name')!.candidates[0].confidence).toBeCloseTo(0.95);
    expect(buckets.get('company_name')!.candidates[0].sourceHintMatch).toBe(true);
  });

  test('clamps boosted confidence to 1.0', () => {
    const fields = [
      makeFieldDefinition({ key: 'company_name', sourceHints: ['about'] }),
    ];
    const pageResults = [
      makePageExtractionResult({
        url: 'https://example.com/about',
        fields: [makePageFieldExtraction({ key: 'company_name', confidence: 0.95 })],
      }),
    ];
    const buckets = buildMergeBuckets(fields, pageResults, { sourceHintBoost: 0.15 });
    expect(buckets.get('company_name')!.candidates[0].confidence).toBe(1);
  });

  test('does not apply sourceHints boost when URL does not match', () => {
    const fields = [
      makeFieldDefinition({ key: 'company_name', sourceHints: ['about'] }),
    ];
    const pageResults = [
      makePageExtractionResult({
        url: 'https://example.com/pricing',
        fields: [makePageFieldExtraction({ key: 'company_name', confidence: 0.8 })],
      }),
    ];
    const buckets = buildMergeBuckets(fields, pageResults);
    expect(buckets.get('company_name')!.candidates[0].confidence).toBe(0.8);
    expect(buckets.get('company_name')!.candidates[0].sourceHintMatch).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// mergeField
// ---------------------------------------------------------------------------

describe('mergeField', () => {
  const field = makeFieldDefinition({ key: 'company_name' });

  test('returns unknown for empty bucket', () => {
    const bucket: FieldMergeBucket = { key: 'company_name', candidates: [] };
    const result = mergeField(field, bucket);
    expect(result.status).toBe('unknown');
    expect(result.value).toBeNull();
    expect(result.confidence).toBe(0);
    expect(result.citations).toHaveLength(0);
  });

  test('single candidate above threshold → auto', () => {
    const bucket: FieldMergeBucket = {
      key: 'company_name',
      candidates: [{
        value: 'Acme Corp',
        confidence: 0.9,
        citation: { url: 'https://x.com', snippet: 's', retrievedAt: '2024-01-01T00:00:00Z' },
        sourceHintMatch: false,
      }],
    };
    const result = mergeField(field, bucket);
    expect(result.status).toBe('auto');
    expect(result.value).toBe('Acme Corp');
    expect(result.confidence).toBe(0.9);
    expect(result.citations).toHaveLength(1);
  });

  test('single candidate below threshold → needs_review', () => {
    const bucket: FieldMergeBucket = {
      key: 'company_name',
      candidates: [{
        value: 'Maybe Corp',
        confidence: 0.5,
        citation: { url: 'https://x.com', snippet: 's', retrievedAt: '2024-01-01T00:00:00Z' },
        sourceHintMatch: false,
      }],
    };
    const result = mergeField(field, bucket);
    expect(result.status).toBe('needs_review');
    expect(result.reason).toContain('Confidence');
    expect(result.reason).toContain('threshold');
  });

  test('multiple pages same value → combined citations', () => {
    const bucket: FieldMergeBucket = {
      key: 'company_name',
      candidates: [
        {
          value: 'Acme Corp',
          confidence: 0.9,
          citation: { url: 'https://x.com/about', snippet: 's1', retrievedAt: '2024-01-01T00:00:00Z' },
          sourceHintMatch: false,
        },
        {
          value: 'acme corp',
          confidence: 0.85,
          citation: { url: 'https://x.com/contact', snippet: 's2', retrievedAt: '2024-01-01T00:00:00Z' },
          sourceHintMatch: false,
        },
      ],
    };
    const result = mergeField(field, bucket);
    expect(result.status).toBe('auto');
    expect(result.citations).toHaveLength(2);
    // Corroboration: min(1, 0.9 + 0.1*(2-1)) = 1.0
    expect(result.confidence).toBeCloseTo(1.0);
  });

  test('multi-page conflict → needs_review with reason', () => {
    const bucket: FieldMergeBucket = {
      key: 'company_name',
      candidates: [
        {
          value: 'Acme Corp',
          confidence: 0.9,
          citation: { url: 'https://x.com/about', snippet: 's1', retrievedAt: '2024-01-01T00:00:00Z' },
          sourceHintMatch: false,
        },
        {
          value: 'Acme Corporation',
          confidence: 0.85,
          citation: { url: 'https://x.com/contact', snippet: 's2', retrievedAt: '2024-01-01T00:00:00Z' },
          sourceHintMatch: false,
        },
      ],
    };
    const result = mergeField(field, bucket);
    expect(result.status).toBe('needs_review');
    expect(result.reason).toContain('Conflicting');
    expect(result.reason).toContain('Acme Corp');
    expect(result.reason).toContain('Acme Corporation');
  });

  test('higher confidence wins in conflict', () => {
    const bucket: FieldMergeBucket = {
      key: 'company_name',
      candidates: [
        {
          value: 'Acme Corp',
          confidence: 0.9,
          citation: { url: 'https://x.com', snippet: 's1', retrievedAt: '2024-01-01T00:00:00Z' },
          sourceHintMatch: false,
        },
        {
          value: 'Beta Inc',
          confidence: 0.5,
          citation: { url: 'https://x.com', snippet: 's2', retrievedAt: '2024-01-01T00:00:00Z' },
          sourceHintMatch: false,
        },
      ],
    };
    const result = mergeField(field, bucket);
    expect(result.value).toBe('Acme Corp');
  });

  test('aggregate confidence: 3×0.5 beats 1×0.9', () => {
    const bucket: FieldMergeBucket = {
      key: 'company_name',
      candidates: [
        {
          value: 'Acme Corp',
          confidence: 0.5,
          citation: { url: 'https://a.com', snippet: 's', retrievedAt: '2024-01-01T00:00:00Z' },
          sourceHintMatch: false,
        },
        {
          value: 'acme corp',
          confidence: 0.5,
          citation: { url: 'https://b.com', snippet: 's', retrievedAt: '2024-01-01T00:00:00Z' },
          sourceHintMatch: false,
        },
        {
          value: 'Acme Corp',
          confidence: 0.5,
          citation: { url: 'https://c.com', snippet: 's', retrievedAt: '2024-01-01T00:00:00Z' },
          sourceHintMatch: false,
        },
        {
          value: 'Beta Inc',
          confidence: 0.9,
          citation: { url: 'https://d.com', snippet: 's', retrievedAt: '2024-01-01T00:00:00Z' },
          sourceHintMatch: false,
        },
      ],
    };
    const result = mergeField(field, bucket);
    // Acme Corp has totalConfidence 1.5, Beta Inc has 0.9
    expect(result.value).toBe('Acme Corp');
  });

  test('per-field threshold override', () => {
    const fieldWithThreshold = makeFieldDefinition({
      key: 'company_name',
      confidenceThreshold: 0.5,
    });
    const bucket: FieldMergeBucket = {
      key: 'company_name',
      candidates: [{
        value: 'Test',
        confidence: 0.6,
        citation: { url: 'https://x.com', snippet: 's', retrievedAt: '2024-01-01T00:00:00Z' },
        sourceHintMatch: false,
      }],
    };
    // 0.6 >= 0.5 threshold → auto
    const result = mergeField(fieldWithThreshold, bucket);
    expect(result.status).toBe('auto');
  });

  test('conflict overrides even high-threshold pass', () => {
    const bucket: FieldMergeBucket = {
      key: 'company_name',
      candidates: [
        {
          value: 'Alpha',
          confidence: 0.95,
          citation: { url: 'https://x.com', snippet: 's', retrievedAt: '2024-01-01T00:00:00Z' },
          sourceHintMatch: false,
        },
        {
          value: 'Beta',
          confidence: 0.92,
          citation: { url: 'https://y.com', snippet: 's', retrievedAt: '2024-01-01T00:00:00Z' },
          sourceHintMatch: false,
        },
      ],
    };
    const result = mergeField(field, bucket);
    expect(result.status).toBe('needs_review');
  });
});

// ---------------------------------------------------------------------------
// mergeField — corroboration confidence
// ---------------------------------------------------------------------------

describe('mergeField corroboration', () => {
  const field = makeFieldDefinition({ key: 'company_name' });

  const makeCand = (confidence: number): MergeCandidate => ({
    value: 'Acme Corp',
    confidence,
    citation: { url: 'https://x.com', snippet: 's', retrievedAt: '2024-01-01T00:00:00Z' },
    sourceHintMatch: false,
  });

  test('single source: confidence unchanged', () => {
    const bucket: FieldMergeBucket = {
      key: 'company_name',
      candidates: [makeCand(0.5)],
    };
    const result = mergeField(field, bucket);
    expect(result.confidence).toBeCloseTo(0.5);
  });

  test('3 sources at 0.5 → 0.7', () => {
    const bucket: FieldMergeBucket = {
      key: 'company_name',
      candidates: [makeCand(0.5), makeCand(0.5), makeCand(0.5)],
    };
    // min(1, 0.5 + 0.1*(3-1)) = min(1, 0.7) = 0.7
    const result = mergeField(field, bucket);
    expect(result.confidence).toBeCloseTo(0.7);
  });

  test('2 sources at 0.9 → clamped to 1.0', () => {
    const bucket: FieldMergeBucket = {
      key: 'company_name',
      candidates: [makeCand(0.9), makeCand(0.9)],
    };
    // min(1, 0.9 + 0.1*(2-1)) = min(1, 1.0) = 1.0
    const result = mergeField(field, bucket);
    expect(result.confidence).toBeCloseTo(1.0);
  });

  test('custom corroborationBoost override', () => {
    const bucket: FieldMergeBucket = {
      key: 'company_name',
      candidates: [makeCand(0.5), makeCand(0.5), makeCand(0.5)],
    };
    // min(1, 0.5 + 0.2*(3-1)) = min(1, 0.9) = 0.9
    const result = mergeField(field, bucket, { corroborationBoost: 0.2 });
    expect(result.confidence).toBeCloseTo(0.9);
  });
});

// ---------------------------------------------------------------------------
// synthesizeFields (integration)
// ---------------------------------------------------------------------------

describe('synthesizeFields', () => {
  test('single page, single field → correct output', () => {
    const fields = [makeFieldDefinition({ key: 'company_name' })];
    const pageResults = [
      makePageExtractionResult({
        url: 'https://example.com/about',
        pageTitle: 'About',
        fetchedAt: '2024-01-01T00:00:00Z',
        fields: [makePageFieldExtraction({ key: 'company_name', value: 'Test Co', confidence: 0.9 })],
      }),
    ];

    const result = synthesizeFields(fields, pageResults);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('company_name');
    expect(result[0].value).toBe('Test Co');
    expect(result[0].status).toBe('auto');
  });

  test('no extractions for a field → unknown', () => {
    const fields = [
      makeFieldDefinition({ key: 'company_name' }),
      makeFieldDefinition({ key: 'phone' }),
    ];
    const pageResults = [
      makePageExtractionResult({
        fields: [makePageFieldExtraction({ key: 'company_name', value: 'Test', confidence: 0.9 })],
      }),
    ];

    const result = synthesizeFields(fields, pageResults);
    const phone = result.find((f) => f.key === 'phone')!;
    expect(phone.status).toBe('unknown');
    expect(phone.value).toBeNull();
  });

  test('empty page results → all unknown', () => {
    const fields = [
      makeFieldDefinition({ key: 'company_name' }),
      makeFieldDefinition({ key: 'industry' }),
    ];
    const result = synthesizeFields(fields, []);
    expect(result.every((f) => f.status === 'unknown')).toBe(true);
  });
});
