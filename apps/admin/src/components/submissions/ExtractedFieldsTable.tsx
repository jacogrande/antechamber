import { ExternalLink, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
import { FieldTypeIcon } from '@/components/schemas/FieldTypeIcon'
import type { ExtractedFieldValue, ExtractedFieldStatus } from '@/types/submission'

interface ExtractedFieldsTableProps {
  fields: ExtractedFieldValue[]
}

const statusConfig: Record<
  ExtractedFieldStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' }
> = {
  found: { label: 'Found', variant: 'default' },
  not_found: { label: 'Not Found', variant: 'secondary' },
  unknown: { label: 'Unknown', variant: 'destructive' },
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

export function ExtractedFieldsTable({ fields }: ExtractedFieldsTableProps) {
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
            <TableHead>Status</TableHead>
            <TableHead>Citations</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((field) => {
            const status = statusConfig[field.status]
            return (
              <TableRow key={field.fieldKey}>
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
                  <span
                    className="max-w-[300px] truncate block"
                    title={formatValue(field.value)}
                  >
                    {formatValue(field.value)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell>
                  {field.citations.length > 0 ? (
                    <div className="flex items-center gap-1">
                      {field.citations.map((citation, idx) => (
                        <Tooltip key={idx}>
                          <TooltipTrigger asChild>
                            <a
                              href={citation.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-primary hover:text-primary/80"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[300px]">
                            <p className="font-bold mb-1">{citation.sourceUrl}</p>
                            <p className="text-sm">"{citation.snippetText}"</p>
                            <p className="text-xs mt-1">
                              Confidence: {Math.round(citation.confidence * 100)}%
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                      <span className="text-xs text-muted-foreground">
                        ({field.citations.length})
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Info className="h-4 w-4" />
                      <span className="text-xs">None</span>
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
