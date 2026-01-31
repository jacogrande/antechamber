import { useState, useEffect, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSchemaBuilderContext } from './SchemaBuilderProvider'
import { FieldTypeBadge } from './FieldTypeBadge'
import { AnimatedContainer } from '@/components/common/AnimatedContainer'
import { cn } from '@/lib/utils'
import type { FieldDefinition, FieldType } from '@/types/schema'

const fieldTypes: { type: FieldType; label: string }[] = [
  { type: 'string', label: 'Text' },
  { type: 'number', label: 'Number' },
  { type: 'boolean', label: 'Yes/No' },
  { type: 'enum', label: 'Choice' },
  { type: 'string[]', label: 'List' },
]

export function SchemaFieldList() {
  const { state, reorderFields, addField, selectField } = useSchemaBuilderContext()
  const { fields, selectedIndex } = state

  // Track newly added fields for entrance animation
  const [newFieldKeys, setNewFieldKeys] = useState<Set<string>>(new Set())
  const prevFieldKeysRef = useRef<string[]>([])

  useEffect(() => {
    const currentKeys = fields.map((f) => f.key)
    const prevKeys = prevFieldKeysRef.current

    // Find newly added keys
    const addedKeys = currentKeys.filter((key) => !prevKeys.includes(key))

    if (addedKeys.length > 0) {
      setNewFieldKeys((prev) => new Set([...prev, ...addedKeys]))

      // Clear animation state after animation completes
      const timer = setTimeout(() => {
        setNewFieldKeys((prev) => {
          const next = new Set(prev)
          addedKeys.forEach((key) => next.delete(key))
          return next
        })
      }, 500) // Match animation duration

      prevFieldKeysRef.current = currentKeys
      return () => clearTimeout(timer)
    }

    prevFieldKeysRef.current = currentKeys
  }, [fields])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.key === active.id)
      const newIndex = fields.findIndex((f) => f.key === over.id)
      reorderFields(oldIndex, newIndex)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with add button */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Fields
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2">
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[140px]">
            {fieldTypes.map((ft) => (
              <DropdownMenuItem
                key={ft.type}
                onClick={() => addField(ft.type)}
              >
                {ft.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Field list */}
      <div className="flex-1 overflow-y-auto py-1">
        {fields.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">No fields yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click "Add" to create a field
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={fields.map((f) => f.key)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col">
                {fields.map((field, index) => {
                  const isNew = newFieldKeys.has(field.key)
                  const item = (
                    <FieldListItem
                      key={field.key}
                      field={field}
                      isSelected={index === selectedIndex}
                      onClick={() => selectField(index)}
                    />
                  )

                  return isNew ? (
                    <AnimatedContainer key={field.key} animation="bounce">
                      {item}
                    </AnimatedContainer>
                  ) : (
                    item
                  )
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  )
}

interface FieldListItemProps {
  field: FieldDefinition
  isSelected: boolean
  onClick: () => void
}

function FieldListItem({ field, isSelected, onClick }: FieldListItemProps) {
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
      className={cn(
        'flex items-center px-3 py-2 mx-1 rounded-md cursor-pointer border transition-colors',
        isSelected
          ? 'bg-primary/5 border-primary/30 dark:bg-primary/10 dark:border-primary/50'
          : 'bg-transparent border-transparent hover:bg-muted',
        isDragging && 'opacity-50'
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing mr-2 opacity-50 hover:opacity-100 text-muted-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3 w-3" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-sm truncate',
              isSelected
                ? 'font-medium text-primary dark:text-primary'
                : 'text-foreground'
            )}
          >
            {field.label || 'Untitled'}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <FieldTypeBadge type={field.type} />
          {field.required && (
            <span className="text-xs text-destructive">Required</span>
          )}
        </div>
      </div>
    </div>
  )
}
