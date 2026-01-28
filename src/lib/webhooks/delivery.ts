import { eq, and, lte, or } from 'drizzle-orm';
import type { Database } from '@/db/client';
import { webhooks, webhookDeliveries } from '@/db/schema';
import { buildSignatureHeader } from './signing';
import type { WebhookPayload, WebhookDeliveryResult, WebhookEventType } from './types';

const MAX_RETRY_ATTEMPTS = 5;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 3600000; // 1 hour

export class WebhookDeliveryService {
  constructor(
    private db: Database,
    private fetchFn: typeof fetch = fetch,
  ) {}

  /**
   * Queue a webhook delivery for later processing.
   */
  async queueDelivery(
    webhookId: string,
    submissionId: string,
    event: WebhookEventType,
    payload: WebhookPayload,
  ): Promise<string> {
    const [delivery] = await this.db
      .insert(webhookDeliveries)
      .values({
        webhookId,
        submissionId,
        event,
        payload,
        status: 'pending',
        attempts: 0,
      })
      .returning({ id: webhookDeliveries.id });

    return delivery.id;
  }

  /**
   * Process a single delivery by ID.
   * Returns true if successful, false if failed.
   */
  async processDelivery(deliveryId: string): Promise<boolean> {
    // Load delivery with webhook info
    const [delivery] = await this.db
      .select({
        id: webhookDeliveries.id,
        webhookId: webhookDeliveries.webhookId,
        submissionId: webhookDeliveries.submissionId,
        payload: webhookDeliveries.payload,
        attempts: webhookDeliveries.attempts,
        endpointUrl: webhooks.endpointUrl,
        secret: webhooks.secret,
        isActive: webhooks.isActive,
      })
      .from(webhookDeliveries)
      .innerJoin(webhooks, eq(webhookDeliveries.webhookId, webhooks.id))
      .where(eq(webhookDeliveries.id, deliveryId));

    if (!delivery) {
      return false;
    }

    // Skip if webhook is inactive
    if (!delivery.isActive) {
      await this.db
        .update(webhookDeliveries)
        .set({
          status: 'failed',
          lastError: 'Webhook is inactive',
          completedAt: new Date(),
        })
        .where(eq(webhookDeliveries.id, deliveryId));
      return false;
    }

    const result = await this.sendWebhook(
      delivery.endpointUrl,
      delivery.payload as WebhookPayload,
      delivery.secret,
    );

    const newAttempts = delivery.attempts + 1;

    if (result.success) {
      await this.db
        .update(webhookDeliveries)
        .set({
          status: 'success',
          attempts: newAttempts,
          lastAttemptAt: new Date(),
          completedAt: new Date(),
        })
        .where(eq(webhookDeliveries.id, deliveryId));
      return true;
    }

    // Failed - check if we should retry
    if (newAttempts >= MAX_RETRY_ATTEMPTS) {
      await this.db
        .update(webhookDeliveries)
        .set({
          status: 'failed',
          attempts: newAttempts,
          lastAttemptAt: new Date(),
          lastError: result.error,
          completedAt: new Date(),
        })
        .where(eq(webhookDeliveries.id, deliveryId));
      return false;
    }

    // Schedule retry with exponential backoff
    const nextRetryAt = this.calculateNextRetry(newAttempts);
    await this.db
      .update(webhookDeliveries)
      .set({
        attempts: newAttempts,
        lastAttemptAt: new Date(),
        lastError: result.error,
        nextRetryAt,
      })
      .where(eq(webhookDeliveries.id, deliveryId));

    return false;
  }

  /**
   * Process all pending deliveries that are ready to be sent.
   * Returns the number of deliveries processed.
   */
  async processPendingDeliveries(batchSize = 10): Promise<number> {
    const now = new Date();

    // Find deliveries that are pending and either have no nextRetryAt or it's passed
    const pendingDeliveries = await this.db
      .select({ id: webhookDeliveries.id })
      .from(webhookDeliveries)
      .where(
        and(
          eq(webhookDeliveries.status, 'pending'),
          or(
            lte(webhookDeliveries.nextRetryAt, now),
            eq(webhookDeliveries.attempts, 0),
          ),
        ),
      )
      .limit(batchSize);

    let processed = 0;
    for (const delivery of pendingDeliveries) {
      await this.processDelivery(delivery.id);
      processed++;
    }

    return processed;
  }

  /**
   * Send a webhook to the endpoint.
   */
  private async sendWebhook(
    url: string,
    payload: WebhookPayload,
    secret: string,
  ): Promise<WebhookDeliveryResult> {
    const body = JSON.stringify(payload);
    const signature = buildSignatureHeader(body, secret);

    try {
      const response = await this.fetchFn(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
        },
        body,
      });

      if (response.ok) {
        return { success: true, statusCode: response.status };
      }

      return {
        success: false,
        statusCode: response.status,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Calculate the next retry time using exponential backoff.
   */
  calculateNextRetry(attempts: number): Date {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, ...
    const delayMs = Math.min(BASE_DELAY_MS * Math.pow(2, attempts - 1), MAX_DELAY_MS);
    return new Date(Date.now() + delayMs);
  }
}
