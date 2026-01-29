import { Select, HStack } from '@chakra-ui/react'
import { FieldTypeIcon, getFieldTypeLabel } from './FieldTypeIcon'
import type { FieldType } from '@/types/schema'

const fieldTypes: FieldType[] = ['string', 'number', 'boolean', 'enum', 'string[]']

interface FieldTypeSelectProps {
  value: FieldType
  onChange: (type: FieldType) => void
  isDisabled?: boolean
}

export function FieldTypeSelect({ value, onChange, isDisabled }: FieldTypeSelectProps) {
  return (
    <HStack spacing={2}>
      <FieldTypeIcon type={value} color="text.muted" />
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value as FieldType)}
        isDisabled={isDisabled}
        size="sm"
        flex={1}
      >
        {fieldTypes.map((type) => (
          <option key={type} value={type}>
            {getFieldTypeLabel(type)}
          </option>
        ))}
      </Select>
    </HStack>
  )
}
