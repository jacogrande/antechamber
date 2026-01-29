import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listWebhooks,
  createWebhook,
  deleteWebhook,
  getWebhookDeliveries,
} from '@/lib/api/webhooks'
import type { CreateWebhookInput } from '@/types/webhook'

export const webhookKeys = {
  all: ['webhooks'] as const,
  lists: () => [...webhookKeys.all, 'list'] as const,
  list: () => [...webhookKeys.lists()] as const,
  details: () => [...webhookKeys.all, 'detail'] as const,
  detail: (id: string) => [...webhookKeys.details(), id] as const,
  deliveries: (id: string) => [...webhookKeys.detail(id), 'deliveries'] as const,
}

export function useWebhooks() {
  return useQuery({
    queryKey: webhookKeys.list(),
    queryFn: listWebhooks,
  })
}

export function useWebhookDeliveries(webhookId: string, enabled = true) {
  return useQuery({
    queryKey: webhookKeys.deliveries(webhookId),
    queryFn: () => getWebhookDeliveries(webhookId),
    enabled,
  })
}

export function useCreateWebhook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateWebhookInput) => createWebhook(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: webhookKeys.lists() })
    },
  })
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteWebhook(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: webhookKeys.lists() })
    },
  })
}
