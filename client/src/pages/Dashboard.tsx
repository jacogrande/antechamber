import { FileText, Globe, Plus } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useStats, useSubmissions } from '@/hooks/useSubmissions'
import { useDisclosure } from '@/hooks/useDisclosure'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  StatCard,
  BentoGrid,
  SubmissionsCard,
  SuccessGauge,
  ActivityTimeline,
} from '@/components/dashboard'
import { CreateSubmissionModal } from '@/components/submissions'
import { RetryableAlert } from '@/components/common'

export function Dashboard() {
  const { user } = useAuth()
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
    isFetching: isStatsFetching,
  } = useStats()
  const {
    data: submissionsData,
    isLoading: submissionsLoading,
    error: submissionsError,
    refetch: refetchSubmissions,
    isFetching: isSubmissionsFetching,
  } = useSubmissions({ limit: 5 })
  const { isOpen, onOpen, onClose } = useDisclosure()

  const hasData = stats && (
    stats.schemas.total > 0 ||
    stats.submissions.total > 0 ||
    stats.webhooks.active > 0
  )

  const successRate = stats && stats.submissions.total > 0
    ? Math.round((stats.submissions.confirmed / stats.submissions.total) * 100)
    : 0

  // Get first name or username from email
  const displayName = user?.email?.split('@')[0] ?? 'there'
  const capitalizedName = displayName.charAt(0).toUpperCase() + displayName.slice(1)

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Overview
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back, {capitalizedName}
          </h1>
        </div>
        <Button onClick={onOpen}>
          <Plus className="h-4 w-4 mr-2" />
          New Submission
        </Button>
      </div>

      {/* Error alerts */}
      {(statsError || submissionsError) && (
        <div className="space-y-3 mb-6">
          {statsError && (
            <RetryableAlert
              message="Failed to load statistics."
              onRetry={() => void refetchStats()}
              isRetrying={isStatsFetching}
            />
          )}
          {submissionsError && (
            <RetryableAlert
              message="Failed to load recent submissions."
              onRetry={() => void refetchSubmissions()}
              isRetrying={isSubmissionsFetching}
            />
          )}
        </div>
      )}

      {/* Bento grid layout */}
      <BentoGrid className="mb-8">
        {/* Large submissions card with sparkline */}
        <div className="[grid-area:submissions] md:row-span-2">
          <SubmissionsCard
            total={stats?.submissions.total ?? 0}
            pending={stats?.submissions.pending ?? 0}
            draft={stats?.submissions.draft ?? 0}
            confirmed={stats?.submissions.confirmed ?? 0}
            isLoading={statsLoading}
          />
        </div>

        {/* Schemas stat */}
        <div className="[grid-area:schemas]">
          <StatCard
            icon={<FileText className="h-5 w-5" />}
            label="Schemas"
            value={stats?.schemas.total ?? 0}
            helpText={stats?.schemas.total === 0 ? 'No schemas yet' : undefined}
            colorScheme="brand"
            isLoading={statsLoading}
            size="sm"
          />
        </div>

        {/* Webhooks stat */}
        <div className="[grid-area:webhooks]">
          <StatCard
            icon={<Globe className="h-5 w-5" />}
            label="Webhooks"
            value={stats?.webhooks.active ?? 0}
            helpText={stats?.webhooks.active === 0 ? 'None configured' : 'Active'}
            colorScheme="brand"
            isLoading={statsLoading}
            size="sm"
          />
        </div>

        {/* Success rate gauge */}
        <div className="[grid-area:success]">
          <Card className="h-full">
            <CardContent className="flex items-center justify-center py-6 h-full">
              {statsLoading ? (
                <div className="w-[120px] h-[120px] bg-muted rounded-full" />
              ) : stats?.submissions.total === 0 ? (
                <div className="text-center space-y-2">
                  <p className="text-muted-foreground text-sm">No submissions yet</p>
                  <p className="text-muted-foreground/60 text-xs">Success rate will appear here</p>
                </div>
              ) : (
                <SuccessGauge
                  value={successRate}
                  size={120}
                  label="Success Rate"
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity timeline */}
        <div className="[grid-area:activity]">
          <ActivityTimeline
            submissions={submissionsData?.submissions ?? []}
            isLoading={submissionsLoading}
          />
        </div>
      </BentoGrid>

      {/* Empty state */}
      {!statsLoading && !hasData && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Get started</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Create your first schema in the Schemas section to start
              collecting data.
            </p>
          </CardContent>
        </Card>
      )}

      <CreateSubmissionModal isOpen={isOpen} onClose={onClose} />
    </div>
  )
}
