import type { FieldType } from '@/types/schema'
import { fieldTypeConfig, getFieldTypeLabel } from '@/lib/field-types'
import { cn } from '@/lib/utils'

interface FieldTypeBadgeProps {
  type: FieldType
  showLabel?: boolean
  className?: string
}

export function FieldTypeBadge({ type, showLabel = true, className }: FieldTypeBadgeProps) {
  const config = fieldTypeConfig[type]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.colors.badge,
        className
      )}
    >
      {showLabel ? config.label : type}
    </span>
  )
}

export { getFieldTypeLabel }
