import { Inbox } from 'lucide-react'
import { Sparkline } from './Sparkline'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface SubmissionsCardProps {
  total: number
  pending: number
  draft: number
  confirmed: number
  trendData?: number[]
  isLoading?: boolean
}

export function SubmissionsCard({
  total,
  pending,
  draft,
  confirmed,
  trendData,
  isLoading = false,
}: SubmissionsCardProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="flex-1">
              <Skeleton className="mb-3 h-3 w-2/5" />
              <Skeleton className="mb-4 h-10 w-1/3" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const displayTrendData = trendData ?? generateMockTrend(total)

  return (
    <Card className="h-full">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-muted p-3">
            <Inbox className="h-6 w-6" />
          </div>
          <div className="flex flex-1 flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Total Submissions
            </span>
            <span className="text-4xl font-bold tracking-tight leading-none">
              {total}
            </span>
            {/* Breakdown */}
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>
                <span className="font-medium text-warning">{pending}</span>{' '}
                pending
              </span>
              <span>
                <span className="font-medium text-info">{draft}</span>{' '}
                draft
              </span>
              <span>
                <span className="font-medium text-success">{confirmed}</span>{' '}
                confirmed
              </span>
            </div>
            {/* Sparkline */}
            <div className="mt-2">
              <Sparkline data={displayTrendData} height={48} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function generateMockTrend(total: number): number[] {
  if (total === 0) return [0, 0, 0, 0, 0, 0, 0]

  const points: number[] = []
  let current = Math.max(1, Math.floor(total * 0.3))

  for (let i = 0; i < 7; i++) {
    points.push(current)
    const change = (Math.random() - 0.3) * (total * 0.2)
    current = Math.max(1, Math.min(total, current + change))
  }

  points[6] = total

  return points
}
