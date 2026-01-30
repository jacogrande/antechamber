import { Button } from '@/components/ui/button'
import { FieldTypeIcon, getFieldTypeLabel } from './FieldTypeIcon'
import { useSchemaBuilderContext } from './SchemaBuilderProvider'
import type { FieldType } from '@/types/schema'

const fieldTypes: FieldType[] = ['string', 'number', 'boolean', 'enum', 'string[]']

export function FieldTypePalette() {
  const { addField } = useSchemaBuilderContext()

  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground mb-3">
        Add Field
      </p>
      <div className="flex flex-col gap-2">
        {fieldTypes.map((type) => (
          <Button
            key={type}
            variant="ghost"
            size="sm"
            className="justify-start font-normal"
            onClick={() => addField(type)}
          >
            <FieldTypeIcon type={type} className="mr-2" />
            {getFieldTypeLabel(type)}
          </Button>
        ))}
      </div>
    </div>
  )
}
