export type AuditEventType =
  | 'schema.created'
  | 'schema.version_created'
  | 'schema.deleted'
  | 'submission.created'
  | 'submission.confirmed'
  | 'submission.field_edited'
  | 'submission.retried'
  | 'webhook.registered'
  | 'webhook.delivery_succeeded'
  | 'webhook.delivery_failed'
  | 'publishable_key.created'
  | 'publishable_key.revoked';

export type AuditResourceType = 'schema' | 'submission' | 'webhook' | 'publishable_key';

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
