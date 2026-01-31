import type { FieldDefinition } from '../../types/domain';
import type { ExtractedContent } from '../crawl/types';
import type { LlmToolDefinition } from './types';

/**
 * Truncate text at a word boundary, appending a marker if truncated.
 */
export function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const truncated = text.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(' ');
  const cutoff = lastSpace > 0 ? lastSpace : maxChars;
  return truncated.slice(0, cutoff) + ' [...truncated]';
}

/**
 * System prompt for the extraction LLM call.
 */
export function buildSystemPrompt(): string {
  return [
    'You are a precise data extraction assistant.',
    'Your task is to extract structured field values from a web page.',
    '',
    'CRITICAL RULES:',
    '- Extract ONLY the fields listed in the schema.',
    '- The snippet MUST directly support the extracted value. The value should be explicitly stated or clearly derivable from the snippet text.',
    '- Do NOT guess, estimate, or infer values that are not explicitly present. If information is not on the page, SKIP that field entirely.',
    '- Do NOT include a field if you cannot find a snippet that directly evidences the value.',
    '',
    'Confidence scoring:',
    '- 0.9-1.0: Value is explicitly stated verbatim in the snippet',
    '- 0.7-0.9: Value is clearly derivable from the snippet (e.g., "founded in 2010" → company_age)',
    '- 0.5-0.7: Value requires some interpretation but snippet provides strong evidence',
    '- Below 0.5: Do NOT extract - evidence is too weak',
    '',
    'Additional rules:',
    '- For enum fields, match to the closest option (case-insensitive). If no option matches, skip the field.',
    '- Always provide a reason explaining how the snippet supports the extracted value.',
    '- If you cannot find direct evidence for a field, do NOT include it. Never guess.',
  ].join('\n');
}

/**
 * Build the user message containing field definitions and page content.
 */
export function buildUserMessage(
  fields: FieldDefinition[],
  page: ExtractedContent,
  options?: { maxBodyChars?: number },
): string {
  const fieldDescriptions = fields
    .map((f) => {
      const parts = [`- ${f.key} (${f.type}): ${f.label}`];
      if (f.instructions) parts.push(`  Instructions: ${f.instructions}`);
      if (f.enumOptions?.length)
        parts.push(`  Options: ${f.enumOptions.join(', ')}`);
      if (f.validation?.regex)
        parts.push(`  Regex: ${f.validation.regex}`);
      return parts.join('\n');
    })
    .join('\n');

  const headings =
    page.headings.length > 0
      ? `Headings:\n${page.headings.map((h) => `- ${h}`).join('\n')}`
      : '';

  const bodyText = truncateText(page.bodyText, options?.maxBodyChars ?? 12_000);

  return [
    '## Fields to Extract',
    '',
    fieldDescriptions,
    '',
    '## Page Content',
    '',
    `URL: ${page.url}`,
    `Title: ${page.title}`,
    page.metaDescription ? `Description: ${page.metaDescription}` : '',
    headings,
    '',
    'Body Text:',
    bodyText,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Build a tool definition that constrains the LLM output to structured field extractions.
 */
export function buildExtractionTool(
  fields: FieldDefinition[],
): LlmToolDefinition {
  const fieldKeys = fields.map((f) => f.key);

  return {
    name: 'extract_fields',
    description:
      'Extract structured field values from the page content with citations.',
    input_schema: {
      type: 'object',
      properties: {
        extractions: {
          type: 'array',
          description: 'List of extracted field values',
          items: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                enum: fieldKeys,
                description: 'The field key from the schema',
              },
              value: {
                description: 'The extracted value',
              },
              confidence: {
                type: 'number',
                minimum: 0,
                maximum: 1,
                description: 'Confidence score between 0 and 1',
              },
              snippet: {
                type: 'string',
                description:
                  'Verbatim text snippet from the page that DIRECTLY evidences this value. The extracted value must be explicitly stated or clearly derivable from this snippet.',
              },
              reason: {
                type: 'string',
                description:
                  'Explain HOW the snippet supports the extracted value. Must demonstrate clear evidence, not guesswork.',
              },
            },
            required: ['key', 'value', 'confidence', 'snippet', 'reason'],
          },
        },
      },
      required: ['extractions'],
    },
  };
}
