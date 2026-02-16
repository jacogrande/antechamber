import type { ExtractedField, FieldDefinition } from '@antechamber/types';

/** Branded type helper */
type Brand<T, B extends string> = T & { readonly __brand: B };

export type TenantId = Brand<string, 'TenantId'>;
export type UserId = Brand<string, 'UserId'>;
export type SchemaId = Brand<string, 'SchemaId'>;
export type SubmissionId = Brand<string, 'SubmissionId'>;
export type WorkflowRunId = Brand<string, 'WorkflowRunId'>;

// Re-export shared types
export type {
  FieldType,
  FieldStatus,
  FieldDefinition,
  Citation,
  SubmissionStatus,
  WebhookEventType,
  KeyEnvironment,
  TenantRole,
} from '@antechamber/types';
export type { ExtractedField as ExtractedFieldValue } from '@antechamber/types';

// Backend-specific composite interfaces

export interface SchemaVersion {
  schemaId: SchemaId;
  version: number;
  name: string;
  fields: FieldDefinition[];
  createdAt: string;
  createdBy: UserId;
}

export interface SubmissionDraft {
  submissionId: SubmissionId;
  tenantId: TenantId;
  schemaId: SchemaId;
  schemaVersion: number;
  websiteUrl: string;
  fields: ExtractedField[];
  createdAt: string;
  workflowRunId: WorkflowRunId;
}

export interface SubmissionConfirmed extends SubmissionDraft {
  confirmedAt: string;
  confirmedBy: 'customer' | 'internal';
}
