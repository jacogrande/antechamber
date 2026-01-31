import { FieldTypeIcon, getFieldTypeLabel } from './FieldTypeIcon'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { FieldType } from '@/types/schema'

const fieldTypes: FieldType[] = ['string', 'number', 'boolean', 'enum', 'string[]']

interface FieldTypeSelectProps {
  value: FieldType
  onChange: (type: FieldType) => void
  isDisabled?: boolean
}

export function FieldTypeSelect({ value, onChange, isDisabled }: FieldTypeSelectProps) {
  return (
    <div className="flex items-center gap-2">
      <FieldTypeIcon type={value} size={16} />
      <Select
        value={value}
        onValueChange={(v) => onChange(v as FieldType)}
        disabled={isDisabled}
      >
        <SelectTrigger className="flex-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {fieldTypes.map((type) => (
            <SelectItem key={type} value={type}>
              {getFieldTypeLabel(type)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
