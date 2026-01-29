import { useState } from 'react'
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Box,
  useDisclosure,
  useToast,
} from '@chakra-ui/react'
import { ConfirmDialog } from '@/components/common'
import type { Webhook } from '@/types/webhook'
import { WebhookRow } from './WebhookRow'
import { useDeleteWebhook } from '@/hooks/useWebhooks'

interface WebhookTableProps {
  webhooks: Webhook[]
}

export function WebhookTable({ webhooks }: WebhookTableProps) {
  const [webhookToDelete, setWebhookToDelete] = useState<Webhook | null>(null)
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure()
  const deleteWebhook = useDeleteWebhook()
  const toast = useToast()

  const handleDeleteClick = (webhook: Webhook) => {
    setWebhookToDelete(webhook)
    onDeleteOpen()
  }

  const handleDeleteConfirm = () => {
    if (!webhookToDelete) return
    void deleteWebhook
      .mutateAsync(webhookToDelete.id)
      .then(() => {
        onDeleteClose()
        setWebhookToDelete(null)
        toast({
          title: 'Webhook deleted',
          status: 'success',
          duration: 3000,
          isClosable: true,
        })
      })
      .catch((err: Error) => {
        onDeleteClose()
        setWebhookToDelete(null)
        toast({
          title: 'Failed to delete webhook',
          description: err.message || 'Please try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      })
  }

  const handleDeleteClose = () => {
    onDeleteClose()
    setWebhookToDelete(null)
  }

  return (
    <>
      <Box overflowX="auto" borderRadius="md" border="1px solid" borderColor="border.default">
        <Table variant="simple">
          <Thead bg="bg.subtle">
            <Tr>
              <Th>Endpoint URL</Th>
              <Th>Events</Th>
              <Th>Status</Th>
              <Th w="60px">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {webhooks.map((webhook) => (
              <WebhookRow
                key={webhook.id}
                webhook={webhook}
                onDelete={handleDeleteClick}
              />
            ))}
          </Tbody>
        </Table>
      </Box>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={handleDeleteClose}
        onConfirm={handleDeleteConfirm}
        title="Delete Webhook"
        message={`Are you sure you want to delete this webhook? This will stop all future deliveries to ${webhookToDelete?.endpointUrl ?? 'this endpoint'}.`}
        confirmLabel="Delete"
        isDestructive
        isLoading={deleteWebhook.isPending}
      />
    </>
  )
}
