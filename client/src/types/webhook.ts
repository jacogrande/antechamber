export type WebhookEventType = 'submission.confirmed'

export interface Webhook {
  id: string
  endpointUrl: string
  events: WebhookEventType[]
  isActive: boolean
  createdAt: string
}

export interface WebhookWithSecret extends Webhook {
  secret: string
}

export interface WebhookDelivery {
  id: string
  webhookId: string
  submissionId: string
  event: string
  status: 'pending' | 'success' | 'failed'
  attempts: number
  lastAttemptAt: string | null
  lastError: string | null
  completedAt: string | null
  createdAt: string
}

export interface CreateWebhookInput {
  endpointUrl: string
  events: WebhookEventType[]
}
