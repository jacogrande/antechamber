import { z } from 'zod';
import { isRegexSafe } from '../lib/validation/regex';

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
        } catch {
          return false;
        }
        // Check for catastrophic backtracking (ReDoS)
        if (!isRegexSafe(f.validation.regex)) {
          return false;
        }
      }
      return true;
    },
    (f) => ({
      message: `validation.regex is invalid or potentially unsafe (ReDoS): ${f.validation?.regex}`,
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

// --- Confirm Submission ---

export const fieldEditSchema = z.object({
  fieldKey: z.string(),
  value: z.unknown(),
});

export type FieldEdit = z.infer<typeof fieldEditSchema>;

export const confirmSubmissionRequestSchema = z.object({
  edits: z.array(fieldEditSchema).optional(),
  confirmedBy: z.enum(['customer', 'internal']),
});

export type ConfirmSubmissionRequest = z.infer<typeof confirmSubmissionRequestSchema>;

// --- Webhooks ---

export const webhookEventTypeSchema = z.enum(['submission.confirmed']);
export type WebhookEventType = z.infer<typeof webhookEventTypeSchema>;

export const registerWebhookRequestSchema = z.object({
  endpointUrl: z.string().url().startsWith('https://'),
  events: z.array(webhookEventTypeSchema).min(1),
});

export type RegisterWebhookRequest = z.infer<typeof registerWebhookRequestSchema>;

export const webhookResponseSchema = z.object({
  id: z.string().uuid(),
  endpointUrl: z.string().url(),
  events: z.array(webhookEventTypeSchema),
  isActive: z.boolean(),
  createdAt: z.string(),
});

export type WebhookResponse = z.infer<typeof webhookResponseSchema>;

// --- Context Pack ---

export const contextPackSourceSchema = z.object({
  url: z.string(),
  title: z.string(),
  retrievedAt: z.string(),
  snippets: z.array(z.string()),
});

export type ContextPackSource = z.infer<typeof contextPackSourceSchema>;

export const contextPackResponseSchema = z.object({
  context: z.object({
    submissionId: z.string().uuid(),
    websiteUrl: z.string(),
    schemaId: z.string().uuid(),
    schemaVersion: z.number(),
    fields: z.record(z.unknown()),
    confirmedAt: z.string(),
  }),
  sources: z.array(contextPackSourceSchema),
  metadata: z.object({
    generatedAt: z.string(),
    version: z.string(),
  }),
});

export type ContextPackResponse = z.infer<typeof contextPackResponseSchema>;

// --- Artifacts ---

export const artifactSchema = z.object({
  url: z.string(),
  type: z.enum(['raw_html', 'extracted_text']),
  signedUrl: z.string(),
  expiresAt: z.string(),
});

export type Artifact = z.infer<typeof artifactSchema>;

export const artifactsResponseSchema = z.object({
  artifacts: z.array(artifactSchema),
});

export type ArtifactsResponse = z.infer<typeof artifactsResponseSchema>;

// --- Health ---

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

// --- Tenants ---

export const createTenantRequestSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only')
    .optional(),
});

export type CreateTenantRequest = z.infer<typeof createTenantRequestSchema>;

export const createTenantResponseSchema = z.object({
  tenant: z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    createdAt: z.string(),
  }),
  membership: z.object({
    role: z.literal('admin'),
  }),
});

export type CreateTenantResponse = z.infer<typeof createTenantResponseSchema>;
