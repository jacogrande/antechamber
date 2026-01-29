import { Badge } from '@chakra-ui/react'
import type { WebhookEventType } from '@/types/webhook'

interface WebhookEventBadgeProps {
  event: WebhookEventType
}

const eventLabels: Record<WebhookEventType, string> = {
  'submission.confirmed': 'submission.confirmed',
}

export function WebhookEventBadge({ event }: WebhookEventBadgeProps) {
  return (
    <Badge variant="outline" fontFamily="mono" fontSize="xs">
      {eventLabels[event] ?? event}
    </Badge>
  )
}
