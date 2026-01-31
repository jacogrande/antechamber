import { Badge } from '@/components/ui/badge'
import type { WebhookEventType } from '@/types/webhook'

interface WebhookEventBadgeProps {
  event: WebhookEventType
}

const eventLabels: Record<WebhookEventType, string> = {
  'submission.confirmed': 'submission.confirmed',
}

export function WebhookEventBadge({ event }: WebhookEventBadgeProps) {
  return (
    <Badge variant="outline" className="font-mono text-xs">
      {eventLabels[event] ?? event}
    </Badge>
  )
}
