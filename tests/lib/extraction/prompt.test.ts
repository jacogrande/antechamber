import { describe, test, expect } from 'bun:test';
import {
  buildSystemPrompt,
  buildUserMessage,
  buildExtractionTool,
  truncateText,
} from '@/lib/extraction/prompt';
import { makeFieldDefinition, makeExtractedContent } from './helpers';

describe('buildSystemPrompt', () => {
  test('returns non-empty string with extraction instructions', () => {
    const prompt = buildSystemPrompt();
    expect(prompt.length).toBeGreaterThan(0);
    expect(prompt).toContain('extract');
    expect(prompt).toContain('confidence');
    expect(prompt).toContain('snippet');
  });

  test('instructs not to fabricate values', () => {
    const prompt = buildSystemPrompt();
    expect(prompt.toLowerCase()).toContain('not fabricate');
  });
});

describe('buildUserMessage', () => {
  test('includes field keys and labels', () => {
    const fields = [
      makeFieldDefinition({ key: 'company_name', label: 'Company Name' }),
      makeFieldDefinition({ key: 'industry', label: 'Industry', type: 'string' }),
    ];
    const page = makeExtractedContent();
    const msg = buildUserMessage(fields, page);

    expect(msg).toContain('company_name');
    expect(msg).toContain('Company Name');
    expect(msg).toContain('industry');
    expect(msg).toContain('Industry');
  });

  test('includes enum options when present', () => {
    const fields = [
      makeFieldDefinition({
        key: 'size',
        label: 'Company Size',
        type: 'enum',
        enumOptions: ['Small', 'Medium', 'Large'],
      }),
    ];
    const page = makeExtractedContent();
    const msg = buildUserMessage(fields, page);

    expect(msg).toContain('Small');
    expect(msg).toContain('Medium');
    expect(msg).toContain('Large');
  });

  test('includes field instructions', () => {
    const fields = [
      makeFieldDefinition({
        key: 'email',
        instructions: 'Primary contact email address',
      }),
    ];
    const page = makeExtractedContent();
    const msg = buildUserMessage(fields, page);

    expect(msg).toContain('Primary contact email address');
  });

  test('includes page URL, title, and body text', () => {
    const page = makeExtractedContent({
      url: 'https://test.com/about',
      title: 'About Test Co',
      bodyText: 'Test Co builds widgets for everyone.',
    });
    const msg = buildUserMessage([makeFieldDefinition()], page);

    expect(msg).toContain('https://test.com/about');
    expect(msg).toContain('About Test Co');
    expect(msg).toContain('Test Co builds widgets');
  });

  test('includes headings when present', () => {
    const page = makeExtractedContent({
      headings: ['Our Team', 'Our Values'],
    });
    const msg = buildUserMessage([makeFieldDefinition()], page);

    expect(msg).toContain('Our Team');
    expect(msg).toContain('Our Values');
  });

  test('custom maxBodyChars truncates long body', () => {
    const longBody = 'word '.repeat(200); // ~1000 chars
    const page = makeExtractedContent({ bodyText: longBody });
    const msg = buildUserMessage([makeFieldDefinition()], page, { maxBodyChars: 100 });

    expect(msg).toContain('[...truncated]');
    // Without the option, the body would not be truncated (under default 12000)
    const fullMsg = buildUserMessage([makeFieldDefinition()], page);
    expect(fullMsg).not.toContain('[...truncated]');
  });

  test('includes regex validation when present', () => {
    const fields = [
      makeFieldDefinition({
        key: 'phone',
        validation: { regex: '^\\+?[0-9\\-\\s]+$' },
      }),
    ];
    const msg = buildUserMessage(fields, makeExtractedContent());

    expect(msg).toContain('^\\+?[0-9\\-\\s]+$');
  });
});

describe('buildExtractionTool', () => {
  test('returns tool with correct name', () => {
    const tool = buildExtractionTool([makeFieldDefinition()]);
    expect(tool.name).toBe('extract_fields');
  });

  test('includes field keys as enum values', () => {
    const fields = [
      makeFieldDefinition({ key: 'company_name' }),
      makeFieldDefinition({ key: 'industry' }),
      makeFieldDefinition({ key: 'phone' }),
    ];
    const tool = buildExtractionTool(fields);
    const schema = tool.input_schema as Record<string, unknown>;
    const props = schema.properties as Record<string, unknown>;
    const extractions = props.extractions as Record<string, unknown>;
    const items = extractions.items as Record<string, unknown>;
    const itemProps = items.properties as Record<string, unknown>;
    const keyProp = itemProps.key as Record<string, unknown>;

    expect(keyProp.enum).toEqual(['company_name', 'industry', 'phone']);
  });

  test('tool schema requires extractions array', () => {
    const tool = buildExtractionTool([makeFieldDefinition()]);
    const schema = tool.input_schema as Record<string, unknown>;
    expect(schema.required).toEqual(['extractions']);
  });
});

describe('truncateText', () => {
  test('returns original text if under limit', () => {
    expect(truncateText('hello world', 100)).toBe('hello world');
  });

  test('truncates at word boundary', () => {
    const text = 'the quick brown fox jumps over the lazy dog';
    const result = truncateText(text, 20);
    expect(result).toContain('[...truncated]');
    // Should cut at word boundary — "fox" ends at position 19, so it includes "brown fox"
    expect(result).toContain('fox');
    // Should NOT include "jumps" which starts after position 20
    expect(result).not.toContain('jumps');
  });

  test('appends truncated marker', () => {
    const text = 'a'.repeat(100) + ' ' + 'b'.repeat(100);
    const result = truncateText(text, 50);
    expect(result.endsWith('[...truncated]')).toBe(true);
  });

  test('handles text with no spaces', () => {
    const text = 'a'.repeat(200);
    const result = truncateText(text, 50);
    // Falls back to maxChars cutoff since no space found
    expect(result.length).toBeLessThanOrEqual(50 + ' [...truncated]'.length);
  });
});
