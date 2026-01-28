import { z } from 'zod';

// ---------------------------------------------------------------------------
// Citation schema
// ---------------------------------------------------------------------------

export const citationSchema = z.object({
  url: z.string(),
  snippet: z.string(),
  pageTitle: z.string().optional(),
  retrievedAt: z.string(),
});

export type Citation = z.infer<typeof citationSchema>;

// ---------------------------------------------------------------------------
// Extracted field value schema (stored in submissions.fields)
// ---------------------------------------------------------------------------

export const extractedFieldValueSchema = z.object({
  key: z.string(),
  value: z.unknown(),
  confidence: z.number().optional(),
  citations: z.array(citationSchema).optional(),
  status: z.enum(['auto', 'needs_review', 'unknown', 'user_edited']).optional(),
  reason: z.string().optional(),
});

// Explicit type with required value for export modules
// Citation fields are optional to handle legacy data
export interface ExtractedFieldForExport {
  key: string;
  value: unknown;
  confidence?: number;
  citations?: Array<{
    url?: string;
    snippet?: string;
    pageTitle?: string;
    title?: string; // Alias for pageTitle used in some contexts
    retrievedAt?: string;
  }>;
  status?: 'auto' | 'needs_review' | 'unknown' | 'user_edited' | string;
  reason?: string;
}

export type ExtractedFieldValue = z.infer<typeof extractedFieldValueSchema>;

export const extractedFieldsSchema = z.array(extractedFieldValueSchema);

// ---------------------------------------------------------------------------
// Edit history entry schema (stored in submissions.editHistory)
// ---------------------------------------------------------------------------

export const editHistoryEntrySchema = z.object({
  fieldKey: z.string(),
  oldValue: z.unknown(),
  newValue: z.unknown(),
  editedAt: z.string(),
  editedBy: z.string(),
});

export type EditHistoryEntry = z.infer<typeof editHistoryEntrySchema>;

export const editHistorySchema = z.array(editHistoryEntrySchema);

// ---------------------------------------------------------------------------
// Field definition schema (stored in schemaVersions.fields)
// ---------------------------------------------------------------------------

export const fieldDefinitionSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'enum', 'string[]']),
  required: z.boolean(),
  instructions: z.string(),
  enumOptions: z.array(z.string()).optional(),
  validation: z.object({
    regex: z.string().optional(),
    minLen: z.number().optional(),
    maxLen: z.number().optional(),
  }).optional(),
  confidenceThreshold: z.number().optional(),
  sourceHints: z.array(z.string()).optional(),
});

export type FieldDefinition = z.infer<typeof fieldDefinitionSchema>;

export const fieldDefinitionsSchema = z.array(fieldDefinitionSchema);

// ---------------------------------------------------------------------------
// Step record schema (stored in workflowRuns.steps)
// ---------------------------------------------------------------------------

export const stepRecordSchema = z.object({
  name: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  output: z.unknown(),
  error: z.string().nullable(),
  attempts: z.number(),
});

export type StepRecord = z.infer<typeof stepRecordSchema>;

export const stepRecordsSchema = z.array(stepRecordSchema);

// ---------------------------------------------------------------------------
// Safe parsing helpers
// ---------------------------------------------------------------------------

/**
 * Parse JSONB fields from database with validation.
 * Returns empty array/default if validation fails.
 */
export function parseExtractedFields(data: unknown): ExtractedFieldForExport[] {
  const result = extractedFieldsSchema.safeParse(data);
  if (!result.success) return [];

  // Ensure value is present (default to null if missing)
  return result.data.map((field) => ({
    key: field.key,
    value: field.value ?? null,
    confidence: field.confidence,
    citations: field.citations,
    status: field.status,
    reason: field.reason,
  }));
}

export function parseEditHistory(data: unknown): EditHistoryEntry[] {
  const result = editHistorySchema.safeParse(data);
  return result.success ? result.data : [];
}

export function parseFieldDefinitions(data: unknown): FieldDefinition[] {
  const result = fieldDefinitionsSchema.safeParse(data);
  return result.success ? result.data : [];
}

export function parseStepRecords(data: unknown): StepRecord[] {
  const result = stepRecordsSchema.safeParse(data);
  return result.success ? result.data : [];
}
