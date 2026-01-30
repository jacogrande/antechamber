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
} from '@dnd-kit/sortable'
import { PlusCircle } from 'lucide-react'
import { FieldRow } from './FieldRow'
import { useSchemaBuilderContext } from './SchemaBuilderProvider'

export function FieldCanvas() {
  const { state, reorderFields } = useSchemaBuilderContext()
  const { fields, selectedIndex } = state

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
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

  if (fields.length === 0) {
    return (
      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
        <PlusCircle className="h-10 w-10 mx-auto mb-3" />
        <p className="font-medium">No fields yet</p>
        <p className="text-sm mt-1">Add fields from the palette on the left</p>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={fields.map((f) => f.key)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-2" role="list" aria-label="Schema fields">
          {fields.map((field, index) => (
            <FieldRow
              key={field.key}
              field={field}
              index={index}
              isSelected={index === selectedIndex}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
