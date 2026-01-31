import { useState } from 'react'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/common'
import { useDisclosure } from '@/hooks/useDisclosure'
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
        toast.success('Webhook deleted')
      })
      .catch((err: Error) => {
        onDeleteClose()
        setWebhookToDelete(null)
        toast.error('Failed to delete webhook', {
          description: err.message || 'Please try again.',
        })
      })
  }

  const handleDeleteClose = () => {
    onDeleteClose()
    setWebhookToDelete(null)
  }

  return (
    <>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Endpoint URL</TableHead>
              <TableHead>Events</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[60px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {webhooks.map((webhook) => (
              <WebhookRow
                key={webhook.id}
                webhook={webhook}
                onDelete={handleDeleteClick}
              />
            ))}
          </TableBody>
        </Table>
      </div>

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
