import type { Database } from '@/db/client';
import { auditLogs } from '@/db/schema';
import type { AuditEntry } from './types';

export class AuditService {
  constructor(private db: Database) {}

  async log(entry: AuditEntry): Promise<void> {
    await this.db.insert(auditLogs).values({
      tenantId: entry.tenantId,
      userId: entry.userId,
      event: entry.event,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      details: entry.details ?? null,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
    });
  }

  async logSchemaCreated(
    tenantId: string,
    schemaId: string,
    userId: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      event: 'schema.created',
      resourceType: 'schema',
      resourceId: schemaId,
      details,
    });
  }

  async logSchemaVersionCreated(
    tenantId: string,
    schemaId: string,
    userId: string,
    version: number,
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      event: 'schema.version_created',
      resourceType: 'schema',
      resourceId: schemaId,
      details: { version },
    });
  }

  async logSubmissionCreated(
    tenantId: string,
    submissionId: string,
    userId?: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      event: 'submission.created',
      resourceType: 'submission',
      resourceId: submissionId,
      details,
    });
  }

  async logSubmissionConfirmed(
    tenantId: string,
    submissionId: string,
    userId: string | undefined,
    confirmedBy: 'customer' | 'internal',
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      event: 'submission.confirmed',
      resourceType: 'submission',
      resourceId: submissionId,
      details: { confirmedBy },
    });
  }

  async logFieldEdited(
    tenantId: string,
    submissionId: string,
    userId: string | undefined,
    fieldKey: string,
    oldValue: unknown,
    newValue: unknown,
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      event: 'submission.field_edited',
      resourceType: 'submission',
      resourceId: submissionId,
      details: { fieldKey, oldValue, newValue },
    });
  }

  async logWebhookRegistered(
    tenantId: string,
    webhookId: string,
    userId: string,
    endpointUrl: string,
    events: string[],
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      event: 'webhook.registered',
      resourceType: 'webhook',
      resourceId: webhookId,
      details: { endpointUrl, events },
    });
  }

  async logWebhookDeliverySucceeded(
    tenantId: string,
    webhookId: string,
    submissionId: string,
    deliveryId: string,
  ): Promise<void> {
    await this.log({
      tenantId,
      event: 'webhook.delivery_succeeded',
      resourceType: 'webhook',
      resourceId: webhookId,
      details: { submissionId, deliveryId },
    });
  }

  async logWebhookDeliveryFailed(
    tenantId: string,
    webhookId: string,
    submissionId: string,
    deliveryId: string,
    error: string,
  ): Promise<void> {
    await this.log({
      tenantId,
      event: 'webhook.delivery_failed',
      resourceType: 'webhook',
      resourceId: webhookId,
      details: { submissionId, deliveryId, error },
    });
  }
}
