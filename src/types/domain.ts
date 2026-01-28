/** Branded type helper */
type Brand<T, B extends string> = T & { readonly __brand: B };

export type TenantId = Brand<string, 'TenantId'>;
export type UserId = Brand<string, 'UserId'>;
export type SchemaId = Brand<string, 'SchemaId'>;
export type SubmissionId = Brand<string, 'SubmissionId'>;
export type WorkflowRunId = Brand<string, 'WorkflowRunId'>;

export type FieldType = 'string' | 'number' | 'boolean' | 'enum' | 'string[]';

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  instructions: string;
  enumOptions?: string[];
  validation?: {
    regex?: string;
    minLen?: number;
    maxLen?: number;
  };
  confidenceThreshold?: number;
  sourceHints?: string[];
}

export interface SchemaVersion {
  schemaId: SchemaId;
  version: number;
  name: string;
  fields: FieldDefinition[];
  createdAt: string;
  createdBy: UserId;
}

export interface Citation {
  url: string;
  snippet: string;
  pageTitle?: string;
  retrievedAt: string;
}

export type FieldStatus = 'auto' | 'needs_review' | 'unknown' | 'user_edited';

export interface ExtractedFieldValue {
  key: string;
  value: unknown;
  confidence: number;
  citations: Citation[];
  status: FieldStatus;
  reason?: string;
}

export interface SubmissionDraft {
  submissionId: SubmissionId;
  tenantId: TenantId;
  schemaId: SchemaId;
  schemaVersion: number;
  websiteUrl: string;
  fields: ExtractedFieldValue[];
  createdAt: string;
  workflowRunId: WorkflowRunId;
}

export interface SubmissionConfirmed extends SubmissionDraft {
  confirmedAt: string;
  confirmedBy: 'customer' | 'internal';
}

export type TenantRole = 'admin' | 'editor' | 'viewer';
