import { describe, it, expect } from 'bun:test';
import { generateCsv, generateBatchCsv } from '../../../src/lib/export/csv';
import type { FieldDefinition } from '../../../src/types/api';

describe('CSV Export', () => {
  const FIELD_DEFINITIONS: FieldDefinition[] = [
    { key: 'company_name', label: 'Company Name', type: 'string', required: true, instructions: 'Extract company name' },
    { key: 'employee_count', label: 'Employees', type: 'number', required: false, instructions: 'Extract employee count' },
    { key: 'is_public', label: 'Is Public', type: 'boolean', required: false, instructions: 'Is publicly traded' },
    { key: 'industry', label: 'Industry', type: 'enum', required: true, instructions: 'Select industry', enumOptions: ['tech', 'finance', 'healthcare'] },
    { key: 'locations', label: 'Locations', type: 'string[]', required: false, instructions: 'Office locations' },
  ];

  const SAMPLE_SUBMISSION = {
    id: 'sub-123',
    websiteUrl: 'https://example.com',
    confirmedAt: '2025-01-01T00:00:00Z',
    confirmedBy: 'customer',
    fields: [
      {
        key: 'company_name',
        value: 'Acme Corp',
        citations: [{ url: 'https://example.com/about', snippet: 'Welcome to Acme Corp' }],
      },
      {
        key: 'employee_count',
        value: 500,
        citations: [{ url: 'https://example.com/team', snippet: '500 employees' }],
      },
      {
        key: 'is_public',
        value: true,
        citations: [],
      },
      {
        key: 'industry',
        value: 'tech',
        citations: [{ url: 'https://example.com', snippet: 'Technology solutions' }],
      },
      {
        key: 'locations',
        value: ['New York', 'San Francisco', 'London'],
        citations: [],
      },
    ],
  };

  describe('generateCsv', () => {
    it('generates correct headers from schema', () => {
      const csv = generateCsv(SAMPLE_SUBMISSION, FIELD_DEFINITIONS);
      const lines = csv.split('\n');
      const headers = lines[0];

      expect(headers).toContain('company_name');
      expect(headers).toContain('company_name_citation');
      expect(headers).toContain('employee_count');
      expect(headers).toContain('employee_count_citation');
    });

    it('includes citation columns adjacent to values', () => {
      const csv = generateCsv(SAMPLE_SUBMISSION, FIELD_DEFINITIONS);
      const lines = csv.split('\n');
      const headers = lines[0].split(',');

      const companyIndex = headers.indexOf('company_name');
      expect(headers[companyIndex + 1]).toBe('company_name_citation');
    });

    it('formats citations correctly', () => {
      const csv = generateCsv(SAMPLE_SUBMISSION, FIELD_DEFINITIONS);

      expect(csv).toContain('https://example.com/about');
      expect(csv).toContain('Welcome to Acme Corp');
    });

    it('handles all field types correctly', () => {
      const csv = generateCsv(SAMPLE_SUBMISSION, FIELD_DEFINITIONS);
      const lines = csv.split('\n');
      const values = lines[1];

      // String
      expect(values).toContain('Acme Corp');
      // Number
      expect(values).toContain('500');
      // Boolean
      expect(values).toContain('true');
      // Enum
      expect(values).toContain('tech');
      // Array - joined with semicolons
      expect(values).toContain('New York; San Francisco; London');
    });

    it('escapes commas in values', () => {
      const submission = {
        ...SAMPLE_SUBMISSION,
        fields: [
          { key: 'company_name', value: 'Acme, Inc.', citations: [] },
        ],
      };

      const csv = generateCsv(submission, FIELD_DEFINITIONS);

      expect(csv).toContain('"Acme, Inc."');
    });

    it('escapes quotes in values', () => {
      const submission = {
        ...SAMPLE_SUBMISSION,
        fields: [
          { key: 'company_name', value: 'Acme "The Best" Corp', citations: [] },
        ],
      };

      const csv = generateCsv(submission, FIELD_DEFINITIONS);

      expect(csv).toContain('"Acme ""The Best"" Corp"');
    });

    it('escapes newlines in values', () => {
      const submission = {
        ...SAMPLE_SUBMISSION,
        fields: [
          { key: 'company_name', value: 'Acme\nCorp', citations: [] },
        ],
      };

      const csv = generateCsv(submission, FIELD_DEFINITIONS);

      expect(csv).toContain('"Acme\nCorp"');
    });

    it('handles missing fields', () => {
      const submission = {
        ...SAMPLE_SUBMISSION,
        fields: [
          { key: 'company_name', value: 'Acme', citations: [] },
        ],
      };

      const csv = generateCsv(submission, FIELD_DEFINITIONS);
      const lines = csv.split('\n');
      const values = lines[1].split(',');

      // Should have empty values for missing fields
      expect(values.filter((v) => v === '').length).toBeGreaterThan(0);
    });

    it('handles empty citations', () => {
      const submission = {
        ...SAMPLE_SUBMISSION,
        fields: [
          { key: 'company_name', value: 'Acme', citations: [] },
        ],
      };

      const csv = generateCsv(submission, FIELD_DEFINITIONS);

      // Citation column should be empty
      const lines = csv.split('\n');
      const headers = lines[0].split(',');
      const values = lines[1].split(',');
      const citationIndex = headers.indexOf('company_name_citation');
      expect(values[citationIndex]).toBe('');
    });

    it('handles null/undefined values', () => {
      const submission = {
        ...SAMPLE_SUBMISSION,
        fields: [
          { key: 'company_name', value: null, citations: [] },
          { key: 'employee_count', value: undefined, citations: [] },
        ],
      };

      const csv = generateCsv(submission, FIELD_DEFINITIONS);

      // Should not throw and should produce valid CSV
      expect(csv).toBeDefined();
      expect(csv.split('\n').length).toBeGreaterThan(1);
    });
  });

  describe('generateBatchCsv', () => {
    it('includes metadata columns', () => {
      const csv = generateBatchCsv([SAMPLE_SUBMISSION], FIELD_DEFINITIONS);
      const headers = csv.split('\n')[0];

      expect(headers).toContain('submission_id');
      expect(headers).toContain('website_url');
      expect(headers).toContain('confirmed_at');
      expect(headers).toContain('confirmed_by');
    });

    it('handles multiple submissions', () => {
      const submissions = [
        SAMPLE_SUBMISSION,
        {
          ...SAMPLE_SUBMISSION,
          id: 'sub-456',
          websiteUrl: 'https://other.com',
        },
      ];

      const csv = generateBatchCsv(submissions, FIELD_DEFINITIONS);
      const lines = csv.trim().split('\n');

      expect(lines.length).toBe(3); // Header + 2 rows
      expect(lines[1]).toContain('sub-123');
      expect(lines[2]).toContain('sub-456');
    });

    it('returns empty string for empty submissions', () => {
      const csv = generateBatchCsv([], FIELD_DEFINITIONS);

      expect(csv).toBe('');
    });
  });
});
