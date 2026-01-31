import { useNavigate } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Schema } from '@/types/schema'

interface SchemaCardProps {
  schema: Schema
  fieldCount?: number
  latestVersion?: number
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function SchemaCard({ schema, fieldCount, latestVersion }: SchemaCardProps) {
  const navigate = useNavigate()

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/50"
      onClick={() => navigate(`/schemas/${schema.id}`)}
    >
      <CardContent className="p-5">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold tracking-tight truncate">
                {schema.name}
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {latestVersion !== undefined && (
              <Badge variant="secondary">v{latestVersion}</Badge>
            )}
            {fieldCount !== undefined && (
              <Badge variant="outline">
                {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
              </Badge>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Updated {formatDate(schema.updatedAt)}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
