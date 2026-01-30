import { useNavigate } from 'react-router-dom'
import { Inbox } from 'lucide-react'
import type { Submission, SubmissionStatus } from '@/types/submission'
import { SubmissionStatusBadge } from './SubmissionStatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface ActivityTimelineProps {
  submissions: Submission[]
  isLoading?: boolean
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`

  return date.toLocaleDateString()
}

function truncateUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname
  } catch {
    return url.slice(0, 30)
  }
}

const statusColors: Record<SubmissionStatus, string> = {
  confirmed: 'bg-success',
  pending: 'bg-warning',
  draft: 'bg-info',
  failed: 'bg-destructive',
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col divide-y divide-border">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-[60px]" />
        </div>
      ))}
    </div>
  )
}

export function ActivityTimeline({
  submissions,
  isLoading = false,
}: ActivityTimelineProps) {
  const navigate = useNavigate()

  const handleClick = (id: string) => {
    navigate(`/submissions/${id}`)
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <LoadingSkeleton />
        ) : submissions.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No activity yet"
            description="Submissions will appear here as you process website data."
          />
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {submissions.map((submission) => (
              <div
                key={submission.id}
                className={cn(
                  'flex items-center gap-3 py-3 px-2 -mx-2 rounded-md cursor-pointer',
                  'transition-colors hover:bg-muted/50'
                )}
                onClick={() => handleClick(submission.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleClick(submission.id)
                  }
                }}
              >
                {/* Status dot */}
                <div
                  className={cn(
                    'h-2.5 w-2.5 rounded-full flex-shrink-0',
                    statusColors[submission.status]
                  )}
                />

                {/* Content */}
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <SubmissionStatusBadge status={submission.status} size="sm" />
                    <span className="text-sm font-medium truncate">
                      {truncateUrl(submission.websiteUrl)}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground truncate">
                    {submission.schemaName ?? 'Unknown schema'}
                  </span>
                </div>

                {/* Time */}
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {formatRelativeTime(submission.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
