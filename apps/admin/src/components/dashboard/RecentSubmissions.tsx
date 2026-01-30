import { useNavigate } from 'react-router-dom'
import { Inbox } from 'lucide-react'
import type { Submission } from '@/types/submission'
import { SubmissionStatusBadge } from './SubmissionStatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

interface RecentSubmissionsProps {
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

function truncateUrl(url: string, maxLength = 40): string {
  try {
    const parsed = new URL(url)
    const display = parsed.hostname + (parsed.pathname !== '/' ? parsed.pathname : '')
    if (display.length <= maxLength) return display
    return display.slice(0, maxLength - 3) + '...'
  } catch {
    if (url.length <= maxLength) return url
    return url.slice(0, maxLength - 3) + '...'
  }
}

function LoadingSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Website</TableHead>
          <TableHead>Schema</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[1, 2, 3, 4, 5].map((i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
            <TableCell><Skeleton className="h-5 w-[80px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function RecentSubmissions({
  submissions,
  isLoading = false,
}: RecentSubmissionsProps) {
  const navigate = useNavigate()

  const handleRowClick = (id: string) => {
    navigate(`/submissions/${id}`)
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Recent Submissions</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <LoadingSkeleton />
        ) : submissions.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No submissions yet"
            description="Submissions will appear here once you start processing website data."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Website</TableHead>
                  <TableHead>Schema</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow
                    key={submission.id}
                    onClick={() => handleRowClick(submission.id)}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                  >
                    <TableCell>
                      <span
                        className="font-mono text-sm text-foreground"
                        title={submission.websiteUrl}
                      >
                        {truncateUrl(submission.websiteUrl)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {submission.schemaName ?? 'Unknown'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <SubmissionStatusBadge status={submission.status} />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeTime(submission.createdAt)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
