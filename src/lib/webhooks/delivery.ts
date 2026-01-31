import { eq } from 'drizzle-orm';
import type { Database } from '@/db/client';
import { webhookDeliveries } from '@/db/schema';
import { buildSignatureHeader } from './signing';
import type { WebhookPayload, WebhookDeliveryResult, WebhookEventType } from './types';

const WEBHOOK_TIMEOUT_MS = 30000; // 30 seconds

export class WebhookDeliveryService {
  constructor(
    private db: Database,
    private fetchFn: typeof fetch = fetch,
  ) {}

  /**
   * Deliver a webhook immediately (synchronous).
   * Creates a delivery record, attempts HTTP POST, and updates the record with the result.
   * Returns the delivery result to the caller.
   */
  async deliverImmediately(
    webhookId: string,
    submissionId: string,
    event: WebhookEventType,
    payload: WebhookPayload,
    endpointUrl: string,
    secret: string,
  ): Promise<{ success: boolean; deliveryId: string; error?: string }> {
    // Create delivery record
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

    // Attempt delivery
    const result = await this.sendWebhook(endpointUrl, payload, secret);

    // Update record with result
    if (result.success) {
      await this.db
        .update(webhookDeliveries)
        .set({
          status: 'success',
          attempts: 1,
          lastAttemptAt: new Date(),
          completedAt: new Date(),
        })
        .where(eq(webhookDeliveries.id, delivery.id));

      return { success: true, deliveryId: delivery.id };
    }

    // Failed - mark as failed (no retries for immediate delivery)
    await this.db
      .update(webhookDeliveries)
      .set({
        status: 'failed',
        attempts: 1,
        lastAttemptAt: new Date(),
        lastError: result.error,
        completedAt: new Date(),
      })
      .where(eq(webhookDeliveries.id, delivery.id));

    return { success: false, deliveryId: delivery.id, error: result.error };
  }

  /**
   * Send a webhook to the endpoint with a timeout.
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
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
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
      // Handle timeout specifically
      if (err instanceof Error && err.name === 'TimeoutError') {
        return {
          success: false,
          error: `Request timed out after ${WEBHOOK_TIMEOUT_MS}ms`,
        };
      }
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }
}
