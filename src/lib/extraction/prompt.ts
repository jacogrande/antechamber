import type { FieldDefinition } from '@/types/domain';
import type { ExtractedContent } from '@/lib/crawl/types';
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
    'Rules:',
    '- Extract ONLY the fields listed in the schema.',
    '- For each field you extract, provide a verbatim text snippet from the page as evidence.',
    '- Assign a confidence score between 0 and 1 for each extracted value.',
    '- If a field cannot be found on the page, do NOT include it in the results.',
    '- Do NOT fabricate or hallucinate values. Only extract what is explicitly present on the page.',
    '- For enum fields, match to the closest option (case-insensitive). If no option matches, skip the field.',
    '- Provide a brief reason for low-confidence extractions (below 0.7).',
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
                  'Verbatim text snippet from the page that supports this extraction',
              },
              reason: {
                type: 'string',
                description:
                  'Brief explanation for the extraction, especially for low-confidence values',
              },
            },
            required: ['key', 'value', 'confidence', 'snippet'],
          },
        },
      },
      required: ['extractions'],
    },
  };
}
