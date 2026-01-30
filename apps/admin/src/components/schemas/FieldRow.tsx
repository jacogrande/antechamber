import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FieldTypeIcon, getFieldTypeLabel } from './FieldTypeIcon'
import { useSchemaBuilderContext } from './SchemaBuilderProvider'
import type { FieldDefinition } from '@/types/schema'
import { cn } from '@/lib/utils'

interface FieldRowProps {
  field: FieldDefinition
  index: number
  isSelected: boolean
}

export function FieldRow({ field, index, isSelected }: FieldRowProps) {
  const { selectField, deleteField, duplicateField } = useSchemaBuilderContext()

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.key })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="listitem"
      aria-selected={isSelected}
      tabIndex={0}
      className={cn(
        'flex items-center p-3 rounded-md border cursor-pointer transition-colors',
        isSelected
          ? 'bg-primary/5 border-primary'
          : 'bg-card border-border hover:border-muted-foreground/50',
        isDragging && 'opacity-50'
      )}
      onClick={() => selectField(index)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          selectField(index)
        }
      }}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab p-1 mr-2 text-muted-foreground hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <FieldTypeIcon type={field.type} size={16} />

      <div className="flex-1 ml-3 min-w-0">
        <p className="font-medium truncate">{field.label}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">
            {getFieldTypeLabel(field.type)}
          </span>
          {field.required && (
            <Badge variant="destructive" className="text-xs py-0 h-5">
              Required
            </Badge>
          )}
        </div>
      </div>

      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => duplicateField(index)}
          aria-label="Duplicate field"
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => deleteField(index)}
          aria-label="Delete field"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
