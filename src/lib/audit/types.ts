export type AuditEventType =
  | 'schema.created'
  | 'schema.version_created'
  | 'submission.created'
  | 'submission.confirmed'
  | 'submission.field_edited'
  | 'webhook.registered'
  | 'webhook.delivery_succeeded'
  | 'webhook.delivery_failed';

export type AuditResourceType = 'schema' | 'submission' | 'webhook';

export interface AuditEntry {
  tenantId: string;
  userId?: string;
  event: AuditEventType;
  resourceType: AuditResourceType;
  resourceId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface EditHistoryEntry {
  fieldKey: string;
  oldValue: unknown;
  newValue: unknown;
  editedAt: string;
  editedBy: string;
}
