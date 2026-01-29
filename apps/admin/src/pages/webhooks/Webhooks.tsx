import { useState } from 'react'
import {
  Box,
  Heading,
  Button,
  Flex,
  useDisclosure,
  useToast,
} from '@chakra-ui/react'
import { HiOutlineGlobeAlt, HiPlus } from 'react-icons/hi'
import { useWebhooks, useCreateWebhook } from '@/hooks/useWebhooks'
import { WebhookTable, WebhookCreateModal, WebhookSecretModal } from '@/components/webhooks'
import { EmptyState, LoadingSpinner, RetryableAlert } from '@/components/common'
import type { CreateWebhookInput, WebhookWithSecret } from '@/types/webhook'

export function Webhooks() {
  const { data: webhooks, isLoading, error, refetch, isFetching } = useWebhooks()
  const createWebhook = useCreateWebhook()
  const toast = useToast()
  const {
    isOpen: isCreateOpen,
    onOpen: onCreateOpen,
    onClose: onCreateClose,
  } = useDisclosure()
  const {
    isOpen: isSecretOpen,
    onOpen: onSecretOpen,
    onClose: onSecretClose,
  } = useDisclosure()
  const [createdWebhook, setCreatedWebhook] = useState<WebhookWithSecret | null>(null)

  const handleCreateSubmit = (input: CreateWebhookInput) => {
    void createWebhook
      .mutateAsync(input)
      .then((webhook) => {
        setCreatedWebhook(webhook)
        onCreateClose()
        onSecretOpen()
      })
      .catch((err: Error) => {
        toast({
          title: 'Failed to create webhook',
          description: err.message || 'Please try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      })
  }

  const handleSecretClose = () => {
    setCreatedWebhook(null)
    onSecretClose()
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
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">Webhooks</Heading>
        {hasWebhooks && (
          <Button leftIcon={<HiPlus />} variant="primary" onClick={onCreateOpen}>
            Add Webhook
          </Button>
        )}
      </Flex>

      {hasWebhooks ? (
        <WebhookTable webhooks={webhooks} />
      ) : (
        <EmptyState
          icon={HiOutlineGlobeAlt}
          title="No webhooks yet"
          description="Register a webhook to receive notifications when submissions are confirmed."
          actionLabel="Add Webhook"
          onAction={onCreateOpen}
        />
      )}

      <WebhookCreateModal
        isOpen={isCreateOpen}
        onClose={onCreateClose}
        onSubmit={handleCreateSubmit}
        isLoading={createWebhook.isPending}
      />

      {createdWebhook && (
        <WebhookSecretModal
          isOpen={isSecretOpen}
          onClose={handleSecretClose}
          secret={createdWebhook.secret}
        />
      )}
    </Box>
  )
}
