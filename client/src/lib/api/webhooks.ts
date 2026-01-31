import { apiGet, apiPost, apiDelete } from './client'
import type {
  Webhook,
  WebhookWithSecret,
  WebhookDelivery,
  CreateWebhookInput,
} from '@/types/webhook'

interface WebhooksListResponse {
  webhooks: Webhook[]
}

interface DeliveriesListResponse {
  deliveries: WebhookDelivery[]
}

export async function listWebhooks(): Promise<Webhook[]> {
  const response = await apiGet<WebhooksListResponse>('/webhooks')
  return response.webhooks
}

export async function createWebhook(input: CreateWebhookInput): Promise<WebhookWithSecret> {
  return apiPost<WebhookWithSecret>('/webhooks', input)
}

export async function deleteWebhook(id: string): Promise<void> {
  await apiDelete(`/webhooks/${id}`)
}

export async function getWebhookDeliveries(id: string): Promise<WebhookDelivery[]> {
  const response = await apiGet<DeliveriesListResponse>(`/webhooks/${id}/deliveries`)
  return response.deliveries
}
