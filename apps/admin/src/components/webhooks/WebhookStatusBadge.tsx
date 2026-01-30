import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface WebhookStatusBadgeProps {
  isActive: boolean
}

export function WebhookStatusBadge({ isActive }: WebhookStatusBadgeProps) {
  return (
    <Badge
      variant={isActive ? 'default' : 'secondary'}
      className="px-2 py-0.5"
    >
      <span className="flex items-center gap-1.5">
        <span
          className={cn(
            'w-2 h-2 rounded-full',
            isActive ? 'bg-green-500' : 'bg-muted-foreground'
          )}
        />
        <span>{isActive ? 'Active' : 'Inactive'}</span>
      </span>
    </Badge>
  )
}
