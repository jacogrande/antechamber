import { useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CollapsibleTableRowProps {
  summary: ReactNode
  children: ReactNode
  defaultExpanded?: boolean
  onToggle?: (isExpanded: boolean) => void
  className?: string
  borderColor?: string
  'aria-selected'?: boolean
}

export function CollapsibleTableRow({
  summary,
  children,
  defaultExpanded = false,
  onToggle,
  className,
  ...props
}: CollapsibleTableRowProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const handleToggle = () => {
    const newState = !isExpanded
    setIsExpanded(newState)
    onToggle?.(newState)
  }

  return (
    <div
      className={cn('border rounded-md overflow-hidden', className)}
      role="listitem"
      {...props}
    >
      <button
        type="button"
        className={cn(
          'w-full flex items-center gap-3 p-3 text-left cursor-pointer transition-colors',
          isExpanded ? 'bg-muted' : 'bg-transparent hover:bg-muted'
        )}
        onClick={handleToggle}
        aria-expanded={isExpanded}
      >
        <ChevronRight
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-150',
            isExpanded && 'rotate-90'
          )}
        />
        <div className="flex-1">{summary}</div>
      </button>
      <div
        className={cn(
          'grid transition-all duration-200 ease-out',
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="p-4 pt-2 border-t bg-muted">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
