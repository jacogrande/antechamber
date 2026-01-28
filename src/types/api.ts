import { z } from 'zod';

// --- Auth ---

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string().nullable(),
  }),
  tenants: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      slug: z.string(),
      role: z.enum(['admin', 'editor', 'viewer']),
    }),
  ),
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const logoutResponseSchema = z.object({
  success: z.boolean(),
});

export type LogoutResponse = z.infer<typeof logoutResponseSchema>;

// --- Error ---

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

// --- Schemas ---

export const fieldTypeEnum = z.enum(['string', 'number', 'boolean', 'enum', 'string[]']);
export type FieldType = z.infer<typeof fieldTypeEnum>;

export const fieldDefinitionSchema = z
  .object({
    key: z.string().min(1).max(100),
    label: z.string().min(1).max(200),
    type: fieldTypeEnum,
    required: z.boolean(),
    instructions: z.string().min(1).max(2000),
    enumOptions: z.array(z.string()).max(50).optional(),
    validation: z
      .object({
        regex: z.string().optional(),
        minLen: z.number().int().min(0).optional(),
        maxLen: z.number().int().min(0).optional(),
      })
      .optional(),
    confidenceThreshold: z.number().min(0).max(1).optional(),
    sourceHints: z.array(z.string().min(1)).max(20).optional(),
  })
  .refine(
    (f) => {
      if (f.type === 'enum') {
        return Array.isArray(f.enumOptions) && f.enumOptions.length > 0;
      }
      return true;
    },
    { message: 'enumOptions must be a non-empty array when type is "enum"' },
  )
  .refine(
    (f) => {
      if (f.validation?.regex) {
        try {
          new RegExp(f.validation.regex);
          return true;
        } catch (e) {
          return false;
        }
      }
      return true;
    },
    (f) => ({
      message: `validation.regex is not a valid regular expression: ${f.validation?.regex}`,
    }),
  )
  .refine(
    (f) => {
      if (
        f.validation?.minLen !== undefined &&
        f.validation?.maxLen !== undefined
      ) {
        return f.validation.minLen <= f.validation.maxLen;
      }
      return true;
    },
    { message: 'validation.minLen must be <= validation.maxLen' },
  );

export type FieldDefinition = z.infer<typeof fieldDefinitionSchema>;

export const createSchemaRequestSchema = z.object({
  name: z.string().min(1).max(200),
  fields: z
    .array(fieldDefinitionSchema)
    .min(1)
    .max(100)
    .refine(
      (fields) => {
        const keys = fields.map((f) => f.key);
        return new Set(keys).size === keys.length;
      },
      { message: 'Field keys must be unique' },
    ),
});

export type CreateSchemaRequest = z.infer<typeof createSchemaRequestSchema>;

export const createSchemaVersionRequestSchema = z.object({
  fields: z
    .array(fieldDefinitionSchema)
    .min(1)
    .max(100)
    .refine(
      (fields) => {
        const keys = fields.map((f) => f.key);
        return new Set(keys).size === keys.length;
      },
      { message: 'Field keys must be unique' },
    ),
});

export type CreateSchemaVersionRequest = z.infer<typeof createSchemaVersionRequestSchema>;

// --- Submissions ---

export const createSubmissionRequestSchema = z.object({
  schemaId: z.string().uuid(),
  schemaVersion: z.number().int().positive().optional(),
  websiteUrl: z.string().url(),
  customerMeta: z.record(z.unknown()).optional(),
});

export type CreateSubmissionRequest = z.infer<typeof createSubmissionRequestSchema>;

// --- Health ---

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
