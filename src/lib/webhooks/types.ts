export type WebhookEventType = 'submission.confirmed';

export interface WebhookPayload {
  event: WebhookEventType;
  submissionId: string;
  tenantId: string;
  submission: {
    id: string;
    schemaId: string;
    schemaVersion: number;
    websiteUrl: string;
    status: string;
    fields: unknown;
    confirmedAt: string;
    confirmedBy: string;
  };
  artifacts: {
    crawledPages: string[];
    htmlSnapshotKeys: string[];
  };
}

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  error?: string;
}

export interface QueuedDelivery {
  id: string;
  webhookId: string;
  submissionId: string;
  event: WebhookEventType;
  payload: WebhookPayload;
  status: 'pending' | 'success' | 'failed';
  attempts: number;
  lastAttemptAt: Date | null;
  lastError: string | null;
  nextRetryAt: Date | null;
}
