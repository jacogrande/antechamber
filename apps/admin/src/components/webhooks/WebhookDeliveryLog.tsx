import { Loader2, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useWebhookDeliveries } from '@/hooks/useWebhooks'
import type { WebhookDelivery } from '@/types/webhook'

interface WebhookDeliveryLogProps {
  webhookId: string
}

// Max retry attempts before delivery is marked as failed (must match backend)
const MAX_DELIVERY_ATTEMPTS = 5

function DeliveryStatusBadge({ status }: { status: WebhookDelivery['status'] }) {
  const variants: Record<WebhookDelivery['status'], 'default' | 'destructive' | 'secondary'> = {
    success: 'default',
    failed: 'destructive',
    pending: 'secondary',
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
      <div className="py-4 text-center">
        <Loader2 className="h-4 w-4 animate-spin mx-auto text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load delivery history</AlertDescription>
      </Alert>
    )
  }

  if (!deliveries || deliveries.length === 0) {
    return (
      <div className="py-4 text-center">
        <p className="text-muted-foreground text-sm">No deliveries yet</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Attempts</TableHead>
            <TableHead>Error</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deliveries.map((delivery) => (
            <TableRow key={delivery.id}>
              <TableCell>
                <span className="text-sm font-mono">
                  {formatDate(delivery.createdAt)}
                </span>
              </TableCell>
              <TableCell>
                <DeliveryStatusBadge status={delivery.status} />
              </TableCell>
              <TableCell>
                <span className="text-sm">
                  {delivery.attempts}/{delivery.status === 'pending' ? '?' : MAX_DELIVERY_ATTEMPTS}
                </span>
              </TableCell>
              <TableCell>
                <span
                  className={`text-sm truncate max-w-[200px] block ${
                    delivery.lastError ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                  title={delivery.lastError ?? undefined}
                >
                  {delivery.lastError ?? '-'}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
