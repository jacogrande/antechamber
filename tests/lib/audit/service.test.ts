import { describe, it, expect } from 'bun:test';
import { AuditService } from '../../../src/lib/audit/service';
import type { AuditEntry } from '../../../src/lib/audit/types';

/**
 * Audit service tests.
 * Uses a mock DB to verify correct audit log entries are created.
 */

interface MockAuditLog {
  tenantId: string;
  userId?: string;
  event: string;
  resourceType: string;
  resourceId: string;
  details: unknown;
  ipAddress?: string;
  userAgent?: string;
}

function createMockDb() {
  const logs: MockAuditLog[] = [];

  return {
    logs,
    insert: () => ({
      values: (entry: MockAuditLog) => {
        logs.push(entry);
        return Promise.resolve();
      },
    }),
  };
}

describe('AuditService', () => {
  describe('log', () => {
    it('logs events with correct structure', async () => {
      const mockDb = createMockDb();
      const service = new AuditService(mockDb as any);

      const entry: AuditEntry = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        event: 'submission.confirmed',
        resourceType: 'submission',
        resourceId: 'sub-1',
        details: { confirmedBy: 'customer' },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      };

      await service.log(entry);

      expect(mockDb.logs).toHaveLength(1);
      expect(mockDb.logs[0].tenantId).toBe('tenant-1');
      expect(mockDb.logs[0].userId).toBe('user-1');
      expect(mockDb.logs[0].event).toBe('submission.confirmed');
      expect(mockDb.logs[0].resourceType).toBe('submission');
      expect(mockDb.logs[0].resourceId).toBe('sub-1');
      expect(mockDb.logs[0].details).toEqual({ confirmedBy: 'customer' });
    });

    it('includes optional fields when provided', async () => {
      const mockDb = createMockDb();
      const service = new AuditService(mockDb as any);

      await service.log({
        tenantId: 'tenant-1',
        event: 'schema.created',
        resourceType: 'schema',
        resourceId: 'schema-1',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(mockDb.logs[0].ipAddress).toBe('192.168.1.1');
      expect(mockDb.logs[0].userAgent).toBe('Mozilla/5.0');
    });

    it('handles missing optional fields', async () => {
      const mockDb = createMockDb();
      const service = new AuditService(mockDb as any);

      await service.log({
        tenantId: 'tenant-1',
        event: 'webhook.registered',
        resourceType: 'webhook',
        resourceId: 'webhook-1',
      });

      expect(mockDb.logs[0].userId).toBeUndefined();
      expect(mockDb.logs[0].details).toBeNull();
    });
  });

  describe('logSubmissionConfirmed', () => {
    it('logs submission confirmed event with correct details', async () => {
      const mockDb = createMockDb();
      const service = new AuditService(mockDb as any);

      await service.logSubmissionConfirmed(
        'tenant-1',
        'sub-123',
        'user-456',
        'customer',
      );

      expect(mockDb.logs).toHaveLength(1);
      expect(mockDb.logs[0].event).toBe('submission.confirmed');
      expect(mockDb.logs[0].resourceType).toBe('submission');
      expect(mockDb.logs[0].resourceId).toBe('sub-123');
      expect(mockDb.logs[0].details).toEqual({ confirmedBy: 'customer' });
    });
  });

  describe('logFieldEdited', () => {
    it('logs field edit with old and new values', async () => {
      const mockDb = createMockDb();
      const service = new AuditService(mockDb as any);

      await service.logFieldEdited(
        'tenant-1',
        'sub-123',
        'user-456',
        'company_name',
        'Old Corp',
        'New Corp',
      );

      expect(mockDb.logs).toHaveLength(1);
      expect(mockDb.logs[0].event).toBe('submission.field_edited');
      expect(mockDb.logs[0].details).toEqual({
        fieldKey: 'company_name',
        oldValue: 'Old Corp',
        newValue: 'New Corp',
      });
    });
  });

  describe('logWebhookRegistered', () => {
    it('logs webhook registration with endpoint and events', async () => {
      const mockDb = createMockDb();
      const service = new AuditService(mockDb as any);

      await service.logWebhookRegistered(
        'tenant-1',
        'webhook-123',
        'user-456',
        'https://example.com/webhook',
        ['submission.confirmed'],
      );

      expect(mockDb.logs).toHaveLength(1);
      expect(mockDb.logs[0].event).toBe('webhook.registered');
      expect(mockDb.logs[0].resourceType).toBe('webhook');
      expect(mockDb.logs[0].details).toEqual({
        endpointUrl: 'https://example.com/webhook',
        events: ['submission.confirmed'],
      });
    });
  });

  describe('logWebhookDeliverySucceeded', () => {
    it('logs successful webhook delivery', async () => {
      const mockDb = createMockDb();
      const service = new AuditService(mockDb as any);

      await service.logWebhookDeliverySucceeded(
        'tenant-1',
        'webhook-123',
        'sub-456',
        'delivery-789',
      );

      expect(mockDb.logs).toHaveLength(1);
      expect(mockDb.logs[0].event).toBe('webhook.delivery_succeeded');
      expect(mockDb.logs[0].details).toEqual({
        submissionId: 'sub-456',
        deliveryId: 'delivery-789',
      });
    });
  });

  describe('logWebhookDeliveryFailed', () => {
    it('logs failed webhook delivery with error', async () => {
      const mockDb = createMockDb();
      const service = new AuditService(mockDb as any);

      await service.logWebhookDeliveryFailed(
        'tenant-1',
        'webhook-123',
        'sub-456',
        'delivery-789',
        'Connection refused',
      );

      expect(mockDb.logs).toHaveLength(1);
      expect(mockDb.logs[0].event).toBe('webhook.delivery_failed');
      expect(mockDb.logs[0].details).toEqual({
        submissionId: 'sub-456',
        deliveryId: 'delivery-789',
        error: 'Connection refused',
      });
    });
  });
});
