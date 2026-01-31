import { ExternalLink, Info, HelpCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Checkbox } from '@/components/ui/checkbox'
import { FieldTypeIcon } from '@/components/schemas/FieldTypeIcon'
import type { ExtractedFieldValue, ExtractedFieldStatus } from '@/types/submission'

interface ExtractedFieldsTableProps {
  fields: ExtractedFieldValue[]
  isEditing?: boolean
  fieldEdits?: Record<string, unknown>
  onFieldEdit?: (fieldKey: string, value: unknown) => void
}

const statusConfig: Record<
  ExtractedFieldStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' }
> = {
  found: { label: 'Found', variant: 'default' },
  not_found: { label: 'Not Found', variant: 'secondary' },
  unknown: { label: 'Unknown', variant: 'destructive' },
}

function ConfidenceIndicator({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence * 100)
  let colorClass = 'bg-red-500'
  if (percent >= 80) colorClass = 'bg-green-500'
  else if (percent >= 50) colorClass = 'bg-yellow-500'
  else if (percent >= 20) colorClass = 'bg-orange-500'

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClass} transition-all`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-8">{percent}%</span>
    </div>
  )
}

interface FieldEditorProps {
  field: ExtractedFieldValue
  value: unknown
  onChange: (value: unknown) => void
}

function FieldEditor({ field, value, onChange }: FieldEditorProps) {
  const currentValue = value ?? field.value

  switch (field.fieldType) {
    case 'boolean':
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={currentValue === true}
            onCheckedChange={(checked) => onChange(checked === true)}
          />
          <span className="text-sm">{currentValue ? 'Yes' : 'No'}</span>
        </div>
      )
    case 'enum':
      // For enum, we'd need the options from the schema
      // For now, treat as text input
      return (
        <Input
          value={String(currentValue ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 text-sm"
        />
      )
    case 'number':
      return (
        <Input
          type="number"
          value={String(currentValue ?? '')}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          className="h-8 text-sm w-32"
        />
      )
    case 'string[]':
      return (
        <Input
          value={Array.isArray(currentValue) ? currentValue.join(', ') : String(currentValue ?? '')}
          onChange={(e) => onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
          placeholder="Comma-separated values"
          className="h-8 text-sm"
        />
      )
    default:
      return (
        <Input
          value={String(currentValue ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 text-sm"
        />
      )
  }
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '-'
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  if (Array.isArray(value)) {
    return value.join(', ')
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

export function ExtractedFieldsTable({
  fields,
  isEditing = false,
  fieldEdits = {},
  onFieldEdit,
}: ExtractedFieldsTableProps) {
  if (fields.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No fields extracted yet.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Field</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Citations</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((field) => {
            const status = statusConfig[field.status]
            const hasEdit = field.fieldKey in fieldEdits
            const editedValue = fieldEdits[field.fieldKey]

            return (
              <TableRow key={field.fieldKey} className={hasEdit ? 'bg-yellow-50 dark:bg-yellow-950/20' : undefined}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {field.fieldType && (
                      <FieldTypeIcon
                        type={field.fieldType}
                        className="h-4 w-4"
                      />
                    )}
                    <div>
                      <p className="font-medium">{field.fieldLabel}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {field.fieldKey}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {isEditing && onFieldEdit ? (
                    <FieldEditor
                      field={field}
                      value={editedValue}
                      onChange={(value) => onFieldEdit(field.fieldKey, value)}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span
                        className="max-w-[250px] truncate block"
                        title={formatValue(hasEdit ? editedValue : field.value)}
                      >
                        {formatValue(hasEdit ? editedValue : field.value)}
                      </span>
                      {field.reason && (
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[300px]">
                            <p className="text-sm">{field.reason}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <ConfidenceIndicator confidence={field.confidence} />
                </TableCell>
                <TableCell>
                  <Badge variant={hasEdit ? 'outline' : status.variant}>
                    {hasEdit ? 'Edited' : status.label}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[350px]">
                  {field.citations.length > 0 ? (
                    <div className="space-y-2">
                      {field.citations.slice(0, 2).map((citation, idx) => (
                        <div key={idx} className="text-sm">
                          <p className="text-muted-foreground italic line-clamp-2">
                            "{citation.snippetText}"
                          </p>
                          <a
                            href={citation.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-0.5"
                          >
                            {new URL(citation.sourceUrl).pathname || '/'}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      ))}
                      {field.citations.length > 2 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="text-xs text-muted-foreground hover:text-foreground">
                              +{field.citations.length - 2} more sources
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[400px]">
                            <div className="space-y-2">
                              {field.citations.slice(2).map((citation, idx) => (
                                <div key={idx}>
                                  <p className="text-sm italic">"{citation.snippetText}"</p>
                                  <a
                                    href={citation.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline"
                                  >
                                    {citation.sourceUrl}
                                  </a>
                                </div>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Info className="h-4 w-4" />
                      <span className="text-xs">No citations</span>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
