import { Badge } from '@/components/ui/badge'
import { CollapsibleTableRow } from '@/components/ui/CollapsibleTableRow'
import { FieldTypeBadge } from './FieldTypeBadge'
import { FieldTypeIcon } from './FieldTypeIcon'
import { cn } from '@/lib/utils'
import type { FieldDefinition } from '@/types/schema'

interface FieldsTableProps {
  fields: FieldDefinition[]
  selectedKey?: string
  onSelect?: (key: string) => void
}

export function FieldsTable({ fields, selectedKey, onSelect }: FieldsTableProps) {
  if (fields.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-4">
        No fields defined yet.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2" role="list" aria-label="Schema fields">
      {fields.map((field) => (
        <CollapsibleTableRow
          key={field.key}
          aria-selected={field.key === selectedKey}
          className={cn(
            field.key === selectedKey ? 'border-primary' : 'border-border'
          )}
          summary={
            <FieldSummary
              field={field}
              isSelected={field.key === selectedKey}
              onSelect={() => onSelect?.(field.key)}
            />
          }
        >
          <FieldDetails field={field} />
        </CollapsibleTableRow>
      ))}
    </div>
  )
}

interface FieldSummaryProps {
  field: FieldDefinition
  isSelected?: boolean
  onSelect?: () => void
}

function FieldSummary({ field, isSelected, onSelect }: FieldSummaryProps) {
  return (
    <div
      className="flex justify-between items-center w-full"
      onClick={(e) => {
        e.stopPropagation()
        onSelect?.()
      }}
    >
      <div className="flex items-center gap-3">
        <FieldTypeIcon
          type={field.type}
          className={cn(isSelected ? 'text-primary' : 'text-muted-foreground')}
        />
        <div>
          <p className="font-medium">{field.label}</p>
          <p className="text-xs text-muted-foreground font-mono">{field.key}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <FieldTypeBadge type={field.type} />
        {field.required && (
          <Badge variant="destructive" className="text-xs">
            Required
          </Badge>
        )}
      </div>
    </div>
  )
}

interface FieldDetailsProps {
  field: FieldDefinition
}

function FieldDetails({ field }: FieldDetailsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">
          Instructions
        </p>
        <p className="text-sm">
          {field.instructions || (
            <span className="text-muted-foreground">No instructions</span>
          )}
        </p>
      </div>

      {field.type === 'enum' && field.enumOptions && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Options
          </p>
          <div className="flex flex-wrap gap-1">
            {field.enumOptions.map((option) => (
              <Badge key={option} variant="outline" className="text-xs">
                {option}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {field.validation && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Validation
          </p>
          <div className="flex flex-col gap-0.5">
            {field.validation.regex && (
              <p className="text-xs font-mono">Pattern: {field.validation.regex}</p>
            )}
            {field.validation.minLen !== undefined && (
              <p className="text-xs">Min length: {field.validation.minLen}</p>
            )}
            {field.validation.maxLen !== undefined && (
              <p className="text-xs">Max length: {field.validation.maxLen}</p>
            )}
          </div>
        </div>
      )}

      {field.sourceHints && field.sourceHints.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Source Hints
          </p>
          <div className="flex flex-wrap gap-1">
            {field.sourceHints.map((hint) => (
              <Badge key={hint} variant="outline" className="text-xs">
                {hint}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {field.confidenceThreshold !== undefined && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Confidence Threshold
          </p>
          <p className="text-sm">{(field.confidenceThreshold * 100).toFixed(0)}%</p>
        </div>
      )}
    </div>
  )
}
