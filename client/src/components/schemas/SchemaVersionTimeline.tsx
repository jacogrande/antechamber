import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SchemaVersion } from '@/types/schema'

interface SchemaVersionTimelineProps {
  schemaId: string
  versions: SchemaVersion[]
  currentVersion: number
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function SchemaVersionTimeline({
  schemaId,
  versions,
  currentVersion,
}: SchemaVersionTimelineProps) {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col">
      {versions.map((version, index) => {
        const isLatest = index === 0
        const isCurrent = version.version === currentVersion

        return (
          <div
            key={version.id}
            className={cn(
              'flex items-center gap-3 p-3 rounded-md',
              isCurrent && 'bg-primary/5 dark:bg-primary/10'
            )}
          >
            <div
              className={cn(
                'w-2 h-2 rounded-full shrink-0',
                isLatest ? 'bg-primary' : 'bg-muted-foreground/30'
              )}
            />
            <div className="flex-1 flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  Version {version.version}
                </span>
                {isLatest && (
                  <Badge variant="secondary" className="text-xs">
                    Latest
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDate(version.createdAt)} - {version.fields.length} fields
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                navigate(`/schemas/${schemaId}/versions/${version.version}`)
              }
            >
              View
            </Button>
          </div>
        )
      })}
    </div>
  )
}
