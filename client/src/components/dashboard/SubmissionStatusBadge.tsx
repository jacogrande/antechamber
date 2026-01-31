import { Badge } from '@/components/ui/badge'
import type { SubmissionStatus } from '@/types/submission'
import { cn } from '@/lib/utils'

interface SubmissionStatusBadgeProps {
  status: SubmissionStatus
  size?: 'sm' | 'md'
}

const statusConfig: Record<
  SubmissionStatus,
  { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info'; dotColor: string }
> = {
  pending: {
    label: 'Pending',
    variant: 'secondary',
    dotColor: 'bg-muted-foreground',
  },
  draft: {
    label: 'Draft',
    variant: 'warning',
    dotColor: 'bg-warning',
  },
  confirmed: {
    label: 'Confirmed',
    variant: 'success',
    dotColor: 'bg-success',
  },
  failed: {
    label: 'Failed',
    variant: 'destructive',
    dotColor: 'bg-destructive',
  },
}

export function SubmissionStatusBadge({ status, size = 'md' }: SubmissionStatusBadgeProps) {
  const config = statusConfig[status]
  const isSmall = size === 'sm'

  return (
    <Badge
      variant={config.variant}
      className={cn(
        'inline-flex items-center gap-1.5',
        isSmall ? 'px-1.5 py-0 text-xs' : 'px-2 py-0.5 text-sm'
      )}
    >
      <span
        className={cn(
          'rounded-full',
          config.dotColor,
          isSmall ? 'h-1.5 w-1.5' : 'h-2 w-2'
        )}
      />
      <span>{config.label}</span>
    </Badge>
  )
}
