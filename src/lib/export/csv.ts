import type { FieldDefinition, ExtractedFieldForExport } from '../validation';

interface ConfirmedSubmission {
  id: string;
  websiteUrl: string;
  fields: ExtractedFieldForExport[];
  confirmedAt: string | Date;
  confirmedBy: string;
}

/**
 * Escape a value for CSV output.
 * Handles commas, quotes, and newlines.
 */
function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  let str: string;
  if (Array.isArray(value)) {
    str = value.join('; ');
  } else if (typeof value === 'object') {
    str = JSON.stringify(value);
  } else {
    str = String(value);
  }

  // If contains special chars, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Generate CSV from a confirmed submission.
 * Columns: field_key, field_value, field_key_citation, ...
 */
export function generateCsv(
  submission: ConfirmedSubmission,
  fieldDefinitions: FieldDefinition[],
): string {
  // Build header row: each field key + citation column
  const headers: string[] = [];
  for (const def of fieldDefinitions) {
    headers.push(def.key);
    headers.push(`${def.key}_citation`);
  }

  // Build value row
  const values: string[] = [];
  const fieldMap = new Map(submission.fields.map((f) => [f.key, f]));

  for (const def of fieldDefinitions) {
    const field = fieldMap.get(def.key);
    if (field) {
      values.push(escapeCsvValue(field.value));

      // Format citation: URL + snippet
      if (field.citations && field.citations.length > 0) {
        const citationParts = field.citations
          .map((c) => {
            const parts: string[] = [];
            if (c.url) parts.push(c.url);
            if (c.snippet) parts.push(`"${c.snippet}"`);
            return parts.join(' - ');
          })
          .join(' | ');
        values.push(escapeCsvValue(citationParts));
      } else {
        values.push('');
      }
    } else {
      values.push('');
      values.push('');
    }
  }

  // Build CSV
  const headerRow = headers.map(escapeCsvValue).join(',');
  const valueRow = values.join(',');

  return `${headerRow}\n${valueRow}\n`;
}

/**
 * Generate CSV with multiple submissions (for batch export).
 */
export function generateBatchCsv(
  submissions: ConfirmedSubmission[],
  fieldDefinitions: FieldDefinition[],
): string {
  if (submissions.length === 0) {
    return '';
  }

  // Build header row
  const headers: string[] = ['submission_id', 'website_url', 'confirmed_at', 'confirmed_by'];
  for (const def of fieldDefinitions) {
    headers.push(def.key);
    headers.push(`${def.key}_citation`);
  }

  const lines: string[] = [headers.map(escapeCsvValue).join(',')];

  // Build value rows
  for (const submission of submissions) {
    const values: string[] = [
      escapeCsvValue(submission.id),
      escapeCsvValue(submission.websiteUrl),
      escapeCsvValue(submission.confirmedAt instanceof Date
        ? submission.confirmedAt.toISOString()
        : submission.confirmedAt),
      escapeCsvValue(submission.confirmedBy),
    ];

    const fieldMap = new Map(submission.fields.map((f) => [f.key, f]));

    for (const def of fieldDefinitions) {
      const field = fieldMap.get(def.key);
      if (field) {
        values.push(escapeCsvValue(field.value));

        if (field.citations && field.citations.length > 0) {
          const citationParts = field.citations
            .map((c) => {
              const parts: string[] = [];
              if (c.url) parts.push(c.url);
              if (c.snippet) parts.push(`"${c.snippet}"`);
              return parts.join(' - ');
            })
            .join(' | ');
          values.push(escapeCsvValue(citationParts));
        } else {
          values.push('');
        }
      } else {
        values.push('');
        values.push('');
      }
    }

    lines.push(values.join(','));
  }

  return lines.join('\n') + '\n';
}
