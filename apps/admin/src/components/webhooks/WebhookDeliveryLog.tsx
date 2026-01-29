import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Text,
  Box,
  Spinner,
  Alert,
  AlertIcon,
} from '@chakra-ui/react'
import { useWebhookDeliveries } from '@/hooks/useWebhooks'
import type { WebhookDelivery } from '@/types/webhook'

interface WebhookDeliveryLogProps {
  webhookId: string
}

// Max retry attempts before delivery is marked as failed (must match backend)
const MAX_DELIVERY_ATTEMPTS = 5

function DeliveryStatusBadge({ status }: { status: WebhookDelivery['status'] }) {
  const variants: Record<WebhookDelivery['status'], string> = {
    success: 'success',
    failed: 'error',
    pending: 'warning',
  }

  return (
    <Badge variant={variants[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function WebhookDeliveryLog({ webhookId }: WebhookDeliveryLogProps) {
  const { data: deliveries, isLoading, error } = useWebhookDeliveries(webhookId)

  if (isLoading) {
    return (
      <Box py={4} textAlign="center">
        <Spinner size="sm" color="brand.600" />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert status="error" size="sm">
        <AlertIcon />
        Failed to load delivery history
      </Alert>
    )
  }

  if (!deliveries || deliveries.length === 0) {
    return (
      <Box py={4} textAlign="center">
        <Text color="text.muted" fontSize="sm">
          No deliveries yet
        </Text>
      </Box>
    )
  }

  return (
    <Box overflowX="auto">
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th>Timestamp</Th>
            <Th>Status</Th>
            <Th>Attempts</Th>
            <Th>Error</Th>
          </Tr>
        </Thead>
        <Tbody>
          {deliveries.map((delivery) => (
            <Tr key={delivery.id}>
              <Td>
                <Text fontSize="sm" fontFamily="mono">
                  {formatDate(delivery.createdAt)}
                </Text>
              </Td>
              <Td>
                <DeliveryStatusBadge status={delivery.status} />
              </Td>
              <Td>
                <Text fontSize="sm">
                  {delivery.attempts}/{delivery.status === 'pending' ? '?' : MAX_DELIVERY_ATTEMPTS}
                </Text>
              </Td>
              <Td>
                <Text
                  fontSize="sm"
                  color={delivery.lastError ? 'status.error' : 'text.muted'}
                  maxW="200px"
                  isTruncated
                  title={delivery.lastError ?? undefined}
                >
                  {delivery.lastError ?? '-'}
                </Text>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  )
}
