import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Flex,
  Box,
  Text,
  IconButton,
  HStack,
  Badge,
} from '@chakra-ui/react'
import { HiOutlineMenu, HiOutlineTrash, HiOutlineDuplicate } from 'react-icons/hi'
import { FieldTypeIcon, getFieldTypeLabel } from './FieldTypeIcon'
import { useSchemaBuilderContext } from './SchemaBuilderProvider'
import type { FieldDefinition } from '@/types/schema'

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
    <Flex
      ref={setNodeRef}
      style={style}
      align="center"
      p={3}
      bg={isSelected ? 'blue.50' : 'bg.surface'}
      borderWidth="1px"
      borderColor={isSelected ? 'brand.500' : 'border.default'}
      borderRadius="md"
      cursor="pointer"
      opacity={isDragging ? 0.5 : 1}
      _hover={{
        borderColor: isSelected ? 'brand.500' : 'border.emphasis',
      }}
      _dark={{
        bg: isSelected ? 'blue.900' : 'bg.surface',
      }}
      onClick={() => selectField(index)}
    >
      <Box
        {...attributes}
        {...listeners}
        cursor="grab"
        p={1}
        mr={2}
        color="text.muted"
        _hover={{ color: 'text.default' }}
        _active={{ cursor: 'grabbing' }}
      >
        <HiOutlineMenu />
      </Box>

      <FieldTypeIcon type={field.type} color="text.muted" />

      <Box flex={1} ml={3} minW={0}>
        <Text fontWeight="medium" noOfLines={1}>
          {field.label}
        </Text>
        <HStack spacing={2} mt={1}>
          <Text fontSize="xs" color="text.muted">
            {getFieldTypeLabel(field.type)}
          </Text>
          {field.required && (
            <Badge size="sm" colorScheme="red" variant="subtle">
              Required
            </Badge>
          )}
        </HStack>
      </Box>

      <HStack spacing={1} onClick={(e) => e.stopPropagation()}>
        <IconButton
          aria-label="Duplicate field"
          icon={<HiOutlineDuplicate />}
          size="sm"
          variant="ghost"
          onClick={() => duplicateField(index)}
        />
        <IconButton
          aria-label="Delete field"
          icon={<HiOutlineTrash />}
          size="sm"
          variant="ghost"
          colorScheme="red"
          onClick={() => deleteField(index)}
        />
      </HStack>
    </Flex>
  )
}
