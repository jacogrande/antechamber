import { describe, it, expect } from 'bun:test';
import { WebhookDeliveryService } from '../../../src/lib/webhooks/delivery';
import type { WebhookPayload } from '../../../src/lib/webhooks/types';

/**
 * Webhook delivery service tests.
 * Uses mock DB and fetch to verify delivery behavior.
 */

interface MockDelivery {
  id: string;
  webhookId: string;
  submissionId: string;
  event: string;
  payload: WebhookPayload;
  status: string;
  attempts: number;
  lastAttemptAt: Date | null;
  lastError: string | null;
  completedAt: Date | null;
}

function createMockFetch(options: {
  status?: number;
  shouldThrow?: boolean;
  errorMessage?: string;
  errorName?: string;
} = {}) {
  const calls: Array<{ url: string; options: RequestInit }> = [];

  const mockFetch = async (url: string, init?: RequestInit) => {
    calls.push({ url, options: init ?? {} });

    if (options.shouldThrow) {
      const error = new Error(options.errorMessage ?? 'Network error');
      if (options.errorName) {
        error.name = options.errorName;
      }
      throw error;
    }

    return {
      ok: (options.status ?? 200) >= 200 && (options.status ?? 200) < 300,
      status: options.status ?? 200,
      statusText: options.status === 200 ? 'OK' : 'Error',
    } as Response;
  };

  return { fetch: mockFetch, calls };
}

const TEST_PAYLOAD: WebhookPayload = {
  event: 'submission.confirmed',
  submissionId: 'sub-123',
  tenantId: 'tenant-1',
  submission: {
    id: 'sub-123',
    schemaId: 'schema-1',
    schemaVersion: 1,
    websiteUrl: 'https://example.com',
    status: 'confirmed',
    fields: [],
    confirmedAt: '2025-01-01T00:00:00Z',
    confirmedBy: 'customer',
  },
  artifacts: {
    crawledPages: [],
    htmlSnapshotKeys: [],
  },
};

function createMockDb() {
  const insertedDeliveries: MockDelivery[] = [];
  let nextId = 1;

  return {
    insertedDeliveries,
    insert: () => ({
      values: (row: any) => ({
        returning: () => {
          const id = `delivery-${nextId++}`;
          const newDelivery: MockDelivery = {
            id,
            webhookId: row.webhookId,
            submissionId: row.submissionId,
            event: row.event,
            payload: row.payload,
            status: row.status ?? 'pending',
            attempts: row.attempts ?? 0,
            lastAttemptAt: null,
            lastError: null,
            completedAt: null,
          };
          insertedDeliveries.push(newDelivery);
          return Promise.resolve([{ id }]);
        },
      }),
    }),
    update: () => ({
      set: (values: any) => ({
        where: () => {
          // Update any inserted deliveries
          if (insertedDeliveries.length > 0) {
            Object.assign(insertedDeliveries[insertedDeliveries.length - 1], values);
          }
          return Promise.resolve();
        },
      }),
    }),
  };
}

describe('WebhookDeliveryService', () => {
  describe('deliverImmediately', () => {
    it('creates delivery and returns success on 2xx response', async () => {
      const mockDb = createMockDb();
      const { fetch, calls } = createMockFetch({ status: 200 });
      const service = new WebhookDeliveryService(mockDb as any, fetch as any);

      const result = await service.deliverImmediately(
        'webhook-1',
        'sub-123',
        'submission.confirmed',
        TEST_PAYLOAD,
        'https://example.com/webhook',
        'test-secret',
      );

      expect(result.success).toBe(true);
      expect(result.deliveryId).toBe('delivery-1');
      expect(result.error).toBeUndefined();
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toBe('https://example.com/webhook');
      expect(mockDb.insertedDeliveries).toHaveLength(1);
      expect(mockDb.insertedDeliveries[0].status).toBe('success');
      expect(mockDb.insertedDeliveries[0].attempts).toBe(1);
    });

    it('creates delivery and returns failure on non-2xx response', async () => {
      const mockDb = createMockDb();
      const { fetch, calls } = createMockFetch({ status: 500 });
      const service = new WebhookDeliveryService(mockDb as any, fetch as any);

      const result = await service.deliverImmediately(
        'webhook-1',
        'sub-123',
        'submission.confirmed',
        TEST_PAYLOAD,
        'https://example.com/webhook',
        'test-secret',
      );

      expect(result.success).toBe(false);
      expect(result.deliveryId).toBe('delivery-1');
      expect(result.error).toContain('HTTP 500');
      expect(calls).toHaveLength(1);
      expect(mockDb.insertedDeliveries).toHaveLength(1);
      expect(mockDb.insertedDeliveries[0].status).toBe('failed');
      expect(mockDb.insertedDeliveries[0].attempts).toBe(1);
    });

    it('handles network errors', async () => {
      const mockDb = createMockDb();
      const { fetch, calls } = createMockFetch({ shouldThrow: true, errorMessage: 'Connection refused' });
      const service = new WebhookDeliveryService(mockDb as any, fetch as any);

      const result = await service.deliverImmediately(
        'webhook-1',
        'sub-123',
        'submission.confirmed',
        TEST_PAYLOAD,
        'https://example.com/webhook',
        'test-secret',
      );

      expect(result.success).toBe(false);
      expect(result.deliveryId).toBe('delivery-1');
      expect(result.error).toBe('Connection refused');
      expect(calls).toHaveLength(1);
      expect(mockDb.insertedDeliveries).toHaveLength(1);
      expect(mockDb.insertedDeliveries[0].status).toBe('failed');
    });

    it('handles timeout errors', async () => {
      const mockDb = createMockDb();
      const { fetch, calls } = createMockFetch({
        shouldThrow: true,
        errorMessage: 'The operation was aborted',
        errorName: 'TimeoutError',
      });
      const service = new WebhookDeliveryService(mockDb as any, fetch as any);

      const result = await service.deliverImmediately(
        'webhook-1',
        'sub-123',
        'submission.confirmed',
        TEST_PAYLOAD,
        'https://example.com/webhook',
        'test-secret',
      );

      expect(result.success).toBe(false);
      expect(result.deliveryId).toBe('delivery-1');
      expect(result.error).toContain('timed out');
      expect(calls).toHaveLength(1);
      expect(mockDb.insertedDeliveries[0].status).toBe('failed');
    });

    it('sends correct headers with signature', async () => {
      const mockDb = createMockDb();
      const { fetch, calls } = createMockFetch({ status: 200 });
      const service = new WebhookDeliveryService(mockDb as any, fetch as any);

      await service.deliverImmediately(
        'webhook-1',
        'sub-123',
        'submission.confirmed',
        TEST_PAYLOAD,
        'https://example.com/webhook',
        'test-secret',
      );

      expect(calls).toHaveLength(1);
      expect(calls[0].options.method).toBe('POST');
      expect((calls[0].options.headers as any)['Content-Type']).toBe('application/json');
      expect((calls[0].options.headers as any)['X-Webhook-Signature']).toMatch(/^t=\d+,v1=[a-f0-9]+$/);
    });

    it('includes abort signal for timeout', async () => {
      const mockDb = createMockDb();
      const { fetch, calls } = createMockFetch({ status: 200 });
      const service = new WebhookDeliveryService(mockDb as any, fetch as any);

      await service.deliverImmediately(
        'webhook-1',
        'sub-123',
        'submission.confirmed',
        TEST_PAYLOAD,
        'https://example.com/webhook',
        'test-secret',
      );

      expect(calls).toHaveLength(1);
      expect(calls[0].options.signal).toBeDefined();
    });
  });
});
