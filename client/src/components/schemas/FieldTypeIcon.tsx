import type { FieldType } from '@/types/schema'
import { fieldTypeConfig, getFieldTypeLabel } from '@/lib/field-types'
import { cn } from '@/lib/utils'

export interface FieldTypeIconProps {
  type: FieldType
  size?: number
  color?: string
  withBackground?: boolean
  backgroundSize?: 'sm' | 'md'
  className?: string
}

export function FieldTypeIcon({
  type,
  size = 20,
  color,
  withBackground = false,
  backgroundSize = 'sm',
  className,
}: FieldTypeIconProps) {
  const config = fieldTypeConfig[type]
  const Icon = config.icon

  if (withBackground) {
    const padding = backgroundSize === 'sm' ? 'p-2' : 'p-3'
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg',
          padding,
          config.colors.bg,
          config.colors.bgDark
        )}
      >
        <Icon
          size={size}
          className={cn(config.colors.text, config.colors.textDark)}
        />
      </div>
    )
  }

  return (
    <Icon
      size={size}
      className={cn(
        color ? undefined : config.colors.text,
        color ? undefined : config.colors.textDark,
        className
      )}
      style={color ? { color } : undefined}
    />
  )
}

export { getFieldTypeLabel }
