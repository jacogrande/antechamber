import { useState } from 'react'
import { toast } from 'sonner'
import { Globe, Plus } from 'lucide-react'
import { useWebhooks, useCreateWebhook } from '@/hooks/useWebhooks'
import { useDisclosure } from '@/hooks/useDisclosure'
import { WebhookTable, WebhookCreateModal, WebhookSecretModal } from '@/components/webhooks'
import { EmptyState, LoadingSpinner, RetryableAlert } from '@/components/common'
import { Button } from '@/components/ui/button'
import type { CreateWebhookInput, WebhookWithSecret } from '@/types/webhook'

export function Webhooks() {
  const { data: webhooks, isLoading, error, refetch, isFetching } = useWebhooks()
  const createWebhook = useCreateWebhook()
  const createModal = useDisclosure()
  const secretModal = useDisclosure()
  const [createdWebhook, setCreatedWebhook] = useState<WebhookWithSecret | null>(null)

  const handleCreateSubmit = (input: CreateWebhookInput) => {
    void createWebhook
      .mutateAsync(input)
      .then((webhook) => {
        setCreatedWebhook(webhook)
        createModal.onClose()
        secretModal.onOpen()
      })
      .catch((err: Error) => {
        toast.error('Failed to create webhook', {
          description: err.message || 'Please try again.',
        })
      })
  }

  const handleSecretClose = () => {
    setCreatedWebhook(null)
    secretModal.onClose()
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error) {
    return (
      <RetryableAlert
        message="Failed to load webhooks. Please try again."
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />
    )
  }

  const hasWebhooks = webhooks && webhooks.length > 0

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Webhooks</h1>
        {hasWebhooks && (
          <Button onClick={createModal.onOpen}>
            <Plus className="h-4 w-4 mr-2" />
            Add Webhook
          </Button>
        )}
      </div>

      {hasWebhooks ? (
        <WebhookTable webhooks={webhooks} />
      ) : (
        <EmptyState
          icon={Globe}
          title="No webhooks yet"
          description="Register a webhook to receive notifications when submissions are confirmed."
          actionLabel="Add Webhook"
          onAction={createModal.onOpen}
        />
      )}

      <WebhookCreateModal
        isOpen={createModal.isOpen}
        onClose={createModal.onClose}
        onSubmit={handleCreateSubmit}
        isLoading={createWebhook.isPending}
      />

      {createdWebhook && (
        <WebhookSecretModal
          isOpen={secretModal.isOpen}
          onClose={handleSecretClose}
          secret={createdWebhook.secret}
        />
      )}
    </div>
  )
}
