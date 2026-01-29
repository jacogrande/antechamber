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
import { VStack, Box, Text, Icon } from '@chakra-ui/react'
import { HiOutlinePlusCircle } from 'react-icons/hi'
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
      <Box
        borderWidth="2px"
        borderStyle="dashed"
        borderColor="border.muted"
        borderRadius="lg"
        p={8}
        textAlign="center"
        color="text.muted"
      >
        <Icon as={HiOutlinePlusCircle} boxSize={10} mb={3} />
        <Text fontWeight="medium">No fields yet</Text>
        <Text fontSize="sm" mt={1}>
          Add fields from the palette on the left
        </Text>
      </Box>
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
        <VStack spacing={2} align="stretch">
          {fields.map((field, index) => (
            <FieldRow
              key={field.key}
              field={field}
              index={index}
              isSelected={index === selectedIndex}
            />
          ))}
        </VStack>
      </SortableContext>
    </DndContext>
  )
}
