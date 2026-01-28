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
  nextRetryAt: Date | null;
  completedAt: Date | null;
}

interface MockWebhook {
  id: string;
  endpointUrl: string;
  secret: string;
  isActive: boolean;
}

function createMockFetch(options: {
  status?: number;
  shouldThrow?: boolean;
  errorMessage?: string;
} = {}) {
  const calls: Array<{ url: string; options: RequestInit }> = [];

  const mockFetch = async (url: string, init?: RequestInit) => {
    calls.push({ url, options: init ?? {} });

    if (options.shouldThrow) {
      throw new Error(options.errorMessage ?? 'Network error');
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

function createMockDb(options: {
  delivery?: MockDelivery;
  webhook?: MockWebhook;
} = {}) {
  const delivery = options.delivery;
  const webhook = options.webhook;
  const insertedDeliveries: MockDelivery[] = [];
  let nextId = 1;

  return {
    delivery,
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
            nextRetryAt: null,
            completedAt: null,
          };
          insertedDeliveries.push(newDelivery);
          return Promise.resolve([{ id }]);
        },
      }),
    }),
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: () => {
            if (!delivery || !webhook) return Promise.resolve([]);
            return Promise.resolve([{
              id: delivery.id,
              webhookId: delivery.webhookId,
              submissionId: delivery.submissionId,
              payload: delivery.payload,
              attempts: delivery.attempts,
              endpointUrl: webhook.endpointUrl,
              secret: webhook.secret,
              isActive: webhook.isActive,
            }]);
          },
        }),
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    }),
    update: () => ({
      set: (values: any) => ({
        where: () => {
          if (delivery) {
            Object.assign(delivery, values);
          }
          return Promise.resolve();
        },
      }),
    }),
  };
}

describe('WebhookDeliveryService', () => {
  describe('queueDelivery', () => {
    it('creates delivery with pending status', async () => {
      const mockDb = createMockDb();
      const service = new WebhookDeliveryService(mockDb as any);

      const id = await service.queueDelivery(
        'webhook-1',
        'sub-123',
        'submission.confirmed',
        TEST_PAYLOAD,
      );

      expect(id).toBe('delivery-1');
      expect(mockDb.insertedDeliveries).toHaveLength(1);
      expect(mockDb.insertedDeliveries[0].status).toBe('pending');
      expect(mockDb.insertedDeliveries[0].attempts).toBe(0);
    });
  });

  describe('processDelivery', () => {
    it('marks delivery as success on 2xx response', async () => {
      const delivery: MockDelivery = {
        id: 'delivery-1',
        webhookId: 'webhook-1',
        submissionId: 'sub-123',
        event: 'submission.confirmed',
        payload: TEST_PAYLOAD,
        status: 'pending',
        attempts: 0,
        lastAttemptAt: null,
        lastError: null,
        nextRetryAt: null,
        completedAt: null,
      };
      const webhook: MockWebhook = {
        id: 'webhook-1',
        endpointUrl: 'https://example.com/webhook',
        secret: 'secret',
        isActive: true,
      };
      const mockDb = createMockDb({ delivery, webhook });
      const { fetch } = createMockFetch({ status: 200 });
      const service = new WebhookDeliveryService(mockDb as any, fetch as any);

      const result = await service.processDelivery('delivery-1');

      expect(result).toBe(true);
      expect(delivery.status).toBe('success');
      expect(delivery.attempts).toBe(1);
    });

    it('schedules retry on non-2xx response', async () => {
      const delivery: MockDelivery = {
        id: 'delivery-1',
        webhookId: 'webhook-1',
        submissionId: 'sub-123',
        event: 'submission.confirmed',
        payload: TEST_PAYLOAD,
        status: 'pending',
        attempts: 0,
        lastAttemptAt: null,
        lastError: null,
        nextRetryAt: null,
        completedAt: null,
      };
      const webhook: MockWebhook = {
        id: 'webhook-1',
        endpointUrl: 'https://example.com/webhook',
        secret: 'secret',
        isActive: true,
      };
      const mockDb = createMockDb({ delivery, webhook });
      const { fetch } = createMockFetch({ status: 500 });
      const service = new WebhookDeliveryService(mockDb as any, fetch as any);

      const result = await service.processDelivery('delivery-1');

      expect(result).toBe(false);
      // Status stays pending for retry
      expect(delivery.attempts).toBe(1);
      expect(delivery.nextRetryAt).not.toBeNull();
      expect(delivery.lastError).toContain('HTTP 500');
    });

    it('marks as failed after max retries', async () => {
      const delivery: MockDelivery = {
        id: 'delivery-1',
        webhookId: 'webhook-1',
        submissionId: 'sub-123',
        event: 'submission.confirmed',
        payload: TEST_PAYLOAD,
        status: 'pending',
        attempts: 4, // Already 4 attempts
        lastAttemptAt: null,
        lastError: null,
        nextRetryAt: null,
        completedAt: null,
      };
      const webhook: MockWebhook = {
        id: 'webhook-1',
        endpointUrl: 'https://example.com/webhook',
        secret: 'secret',
        isActive: true,
      };
      const mockDb = createMockDb({ delivery, webhook });
      const { fetch } = createMockFetch({ status: 500 });
      const service = new WebhookDeliveryService(mockDb as any, fetch as any);

      const result = await service.processDelivery('delivery-1');

      expect(result).toBe(false);
      expect(delivery.status).toBe('failed');
      expect(delivery.attempts).toBe(5);
    });

    it('handles network errors', async () => {
      const delivery: MockDelivery = {
        id: 'delivery-1',
        webhookId: 'webhook-1',
        submissionId: 'sub-123',
        event: 'submission.confirmed',
        payload: TEST_PAYLOAD,
        status: 'pending',
        attempts: 0,
        lastAttemptAt: null,
        lastError: null,
        nextRetryAt: null,
        completedAt: null,
      };
      const webhook: MockWebhook = {
        id: 'webhook-1',
        endpointUrl: 'https://example.com/webhook',
        secret: 'secret',
        isActive: true,
      };
      const mockDb = createMockDb({ delivery, webhook });
      const { fetch } = createMockFetch({ shouldThrow: true, errorMessage: 'Connection refused' });
      const service = new WebhookDeliveryService(mockDb as any, fetch as any);

      const result = await service.processDelivery('delivery-1');

      expect(result).toBe(false);
      expect(delivery.lastError).toBe('Connection refused');
    });

    it('fails immediately if webhook is inactive', async () => {
      const delivery: MockDelivery = {
        id: 'delivery-1',
        webhookId: 'webhook-1',
        submissionId: 'sub-123',
        event: 'submission.confirmed',
        payload: TEST_PAYLOAD,
        status: 'pending',
        attempts: 0,
        lastAttemptAt: null,
        lastError: null,
        nextRetryAt: null,
        completedAt: null,
      };
      const webhook: MockWebhook = {
        id: 'webhook-1',
        endpointUrl: 'https://example.com/webhook',
        secret: 'secret',
        isActive: false,
      };
      const mockDb = createMockDb({ delivery, webhook });
      const { fetch, calls } = createMockFetch();
      const service = new WebhookDeliveryService(mockDb as any, fetch as any);

      const result = await service.processDelivery('delivery-1');

      expect(result).toBe(false);
      expect(delivery.status).toBe('failed');
      expect(delivery.lastError).toBe('Webhook is inactive');
      expect(calls).toHaveLength(0); // Should not attempt delivery
    });

    it('sends correct headers', async () => {
      const delivery: MockDelivery = {
        id: 'delivery-1',
        webhookId: 'webhook-1',
        submissionId: 'sub-123',
        event: 'submission.confirmed',
        payload: TEST_PAYLOAD,
        status: 'pending',
        attempts: 0,
        lastAttemptAt: null,
        lastError: null,
        nextRetryAt: null,
        completedAt: null,
      };
      const webhook: MockWebhook = {
        id: 'webhook-1',
        endpointUrl: 'https://example.com/webhook',
        secret: 'test-secret',
        isActive: true,
      };
      const mockDb = createMockDb({ delivery, webhook });
      const { fetch, calls } = createMockFetch();
      const service = new WebhookDeliveryService(mockDb as any, fetch as any);

      await service.processDelivery('delivery-1');

      expect(calls).toHaveLength(1);
      expect(calls[0].url).toBe('https://example.com/webhook');
      expect(calls[0].options.method).toBe('POST');
      expect((calls[0].options.headers as any)['Content-Type']).toBe('application/json');
      expect((calls[0].options.headers as any)['X-Webhook-Signature']).toMatch(/^t=\d+,v1=[a-f0-9]+$/);
    });

    it('returns false for missing delivery', async () => {
      const mockDb = createMockDb(); // No delivery
      const { fetch } = createMockFetch();
      const service = new WebhookDeliveryService(mockDb as any, fetch as any);

      const result = await service.processDelivery('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('calculateNextRetry', () => {
    it('uses exponential backoff', () => {
      const mockDb = createMockDb();
      const service = new WebhookDeliveryService(mockDb as any);

      const now = Date.now();

      // First retry: ~1s delay
      const retry1 = service.calculateNextRetry(1);
      expect(retry1.getTime()).toBeGreaterThanOrEqual(now + 1000);
      expect(retry1.getTime()).toBeLessThan(now + 2000);

      // Second retry: ~2s delay
      const retry2 = service.calculateNextRetry(2);
      expect(retry2.getTime()).toBeGreaterThanOrEqual(now + 2000);
      expect(retry2.getTime()).toBeLessThan(now + 4000);

      // Third retry: ~4s delay
      const retry3 = service.calculateNextRetry(3);
      expect(retry3.getTime()).toBeGreaterThanOrEqual(now + 4000);
      expect(retry3.getTime()).toBeLessThan(now + 8000);
    });

    it('caps delay at max value', () => {
      const mockDb = createMockDb();
      const service = new WebhookDeliveryService(mockDb as any);

      const now = Date.now();
      const maxDelayMs = 3600000; // 1 hour

      // Very high attempt count should be capped
      const retry = service.calculateNextRetry(100);
      expect(retry.getTime()).toBeLessThanOrEqual(now + maxDelayMs + 1000);
    });
  });
});
