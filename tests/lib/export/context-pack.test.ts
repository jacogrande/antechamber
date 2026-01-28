import { describe, it, expect } from 'bun:test';
import { generateContextPack } from '../../../src/lib/export/context-pack';

describe('Context Pack Export', () => {
  const SAMPLE_SUBMISSION = {
    id: 'sub-123',
    schemaId: 'schema-456',
    schemaVersion: 1,
    websiteUrl: 'https://example.com',
    confirmedAt: '2025-01-01T00:00:00Z',
    fields: [
      {
        key: 'company_name',
        value: 'Acme Corp',
        citations: [
          { url: 'https://example.com/about', snippet: 'Welcome to Acme Corp', title: 'About Us' },
        ],
      },
      {
        key: 'employee_count',
        value: 500,
        citations: [
          { url: 'https://example.com/team', snippet: '500 employees worldwide' },
        ],
      },
      {
        key: 'industry',
        value: 'tech',
        citations: [
          { url: 'https://example.com/about', snippet: 'Leading technology company' },
        ],
      },
    ],
  };

  const SAMPLE_ARTIFACTS = [
    { url: 'https://example.com/about', title: 'About Us', retrievedAt: '2025-01-01T00:00:00Z' },
    { url: 'https://example.com/team', title: 'Our Team', retrievedAt: '2025-01-01T00:01:00Z' },
    { url: 'https://example.com/contact', title: 'Contact', retrievedAt: '2025-01-01T00:02:00Z' },
  ];

  describe('generateContextPack', () => {
    it('returns correct JSON structure', () => {
      const pack = generateContextPack(SAMPLE_SUBMISSION, SAMPLE_ARTIFACTS);

      expect(pack).toHaveProperty('context');
      expect(pack).toHaveProperty('sources');
      expect(pack).toHaveProperty('metadata');
    });

    it('includes all submission context fields', () => {
      const pack = generateContextPack(SAMPLE_SUBMISSION, SAMPLE_ARTIFACTS);

      expect(pack.context.submissionId).toBe('sub-123');
      expect(pack.context.websiteUrl).toBe('https://example.com');
      expect(pack.context.schemaId).toBe('schema-456');
      expect(pack.context.schemaVersion).toBe(1);
      expect(pack.context.confirmedAt).toBe('2025-01-01T00:00:00Z');
    });

    it('flattens fields to key-value pairs', () => {
      const pack = generateContextPack(SAMPLE_SUBMISSION, SAMPLE_ARTIFACTS);

      expect(pack.context.fields).toEqual({
        company_name: 'Acme Corp',
        employee_count: 500,
        industry: 'tech',
      });
    });

    it('deduplicates sources across citations', () => {
      const pack = generateContextPack(SAMPLE_SUBMISSION, SAMPLE_ARTIFACTS);

      // Both company_name and industry cite example.com/about
      const aboutSources = pack.sources.filter((s) => s.url === 'https://example.com/about');
      expect(aboutSources).toHaveLength(1);
    });

    it('combines snippets from same source', () => {
      const pack = generateContextPack(SAMPLE_SUBMISSION, SAMPLE_ARTIFACTS);

      const aboutSource = pack.sources.find((s) => s.url === 'https://example.com/about');
      expect(aboutSource?.snippets).toContain('Welcome to Acme Corp');
      expect(aboutSource?.snippets).toContain('Leading technology company');
    });

    it('includes artifacts not in citations', () => {
      const pack = generateContextPack(SAMPLE_SUBMISSION, SAMPLE_ARTIFACTS);

      const contactSource = pack.sources.find((s) => s.url === 'https://example.com/contact');
      expect(contactSource).toBeDefined();
      expect(contactSource?.title).toBe('Contact');
      expect(contactSource?.snippets).toEqual([]);
    });

    it('includes metadata with version and timestamp', () => {
      const beforeTime = new Date().toISOString();
      const pack = generateContextPack(SAMPLE_SUBMISSION, SAMPLE_ARTIFACTS);
      const afterTime = new Date().toISOString();

      expect(pack.metadata.version).toBe('1.0.0');
      expect(pack.metadata.generatedAt >= beforeTime).toBe(true);
      expect(pack.metadata.generatedAt <= afterTime).toBe(true);
    });

    it('uses artifact title when citation has no title', () => {
      const submission = {
        ...SAMPLE_SUBMISSION,
        fields: [
          {
            key: 'test',
            value: 'value',
            citations: [{ url: 'https://example.com/team', snippet: 'test snippet' }],
          },
        ],
      };

      const pack = generateContextPack(submission, SAMPLE_ARTIFACTS);

      const teamSource = pack.sources.find((s) => s.url === 'https://example.com/team');
      expect(teamSource?.title).toBe('Our Team');
    });

    it('handles empty citations', () => {
      const submission = {
        ...SAMPLE_SUBMISSION,
        fields: [{ key: 'test', value: 'value', citations: [] }],
      };

      const pack = generateContextPack(submission, SAMPLE_ARTIFACTS);

      // Should still include artifacts
      expect(pack.sources).toHaveLength(3);
    });

    it('handles fields without citations', () => {
      const submission = {
        ...SAMPLE_SUBMISSION,
        fields: [{ key: 'test', value: 'value' }],
      };

      const pack = generateContextPack(submission, SAMPLE_ARTIFACTS);

      expect(pack.context.fields).toEqual({ test: 'value' });
      expect(pack.sources).toHaveLength(3);
    });

    it('handles empty artifacts', () => {
      const pack = generateContextPack(SAMPLE_SUBMISSION, []);

      // Should only have sources from citations
      expect(pack.sources.length).toBeGreaterThan(0);
      pack.sources.forEach((s) => {
        expect(s.snippets.length).toBeGreaterThan(0);
      });
    });

    it('handles Date objects for timestamps', () => {
      const submission = {
        ...SAMPLE_SUBMISSION,
        confirmedAt: new Date('2025-01-01T00:00:00Z'),
      };
      const artifacts = [
        { url: 'https://example.com', title: 'Home', retrievedAt: new Date('2025-01-01T00:00:00Z') },
      ];

      const pack = generateContextPack(submission, artifacts);

      expect(pack.context.confirmedAt).toBe('2025-01-01T00:00:00.000Z');
      expect(pack.sources[0].retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});
