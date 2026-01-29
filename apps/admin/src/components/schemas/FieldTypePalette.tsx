import { VStack, Button, Text, Box } from '@chakra-ui/react'
import { FieldTypeIcon, getFieldTypeLabel } from './FieldTypeIcon'
import { useSchemaBuilderContext } from './SchemaBuilderProvider'
import type { FieldType } from '@/types/schema'

const fieldTypes: FieldType[] = ['string', 'number', 'boolean', 'enum', 'string[]']

export function FieldTypePalette() {
  const { addField } = useSchemaBuilderContext()

  return (
    <Box>
      <Text fontSize="sm" fontWeight="medium" color="text.muted" mb={3}>
        Add Field
      </Text>
      <VStack spacing={2} align="stretch">
        {fieldTypes.map((type) => (
          <Button
            key={type}
            variant="ghost"
            size="sm"
            justifyContent="flex-start"
            leftIcon={<FieldTypeIcon type={type} />}
            onClick={() => addField(type)}
            fontWeight="normal"
          >
            {getFieldTypeLabel(type)}
          </Button>
        ))}
      </VStack>
    </Box>
  )
}
