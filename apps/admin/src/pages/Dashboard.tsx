import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  Card,
  CardBody,
  Icon,
  Button,
  HStack,
  VStack,
  useDisclosure,
} from '@chakra-ui/react'
import {
  HiOutlineDocumentText,
  HiOutlineInbox,
  HiOutlineGlobeAlt,
  HiOutlineCheckCircle,
  HiOutlinePlus,
} from 'react-icons/hi'
import { useAuth } from '@/hooks/useAuth'
import { useStats, useSubmissions } from '@/hooks/useSubmissions'
import { StatCard, RecentSubmissions } from '@/components/dashboard'
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
    : null

  return (
    <Box>
      <HStack mb={8} justify="space-between" align="flex-start">
        <Box>
          <Heading size="lg" mb={2}>
            Welcome back
          </Heading>
          <Text color="text.muted">
            {user?.email}
          </Text>
        </Box>
        <Button
          leftIcon={<Icon as={HiOutlinePlus} />}
          variant="primary"
          onClick={onOpen}
        >
          New Submission
        </Button>
      </HStack>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={6} mb={8}>
        <StatCard
          icon={<Icon as={HiOutlineDocumentText} boxSize={5} />}
          label="Total Schemas"
          value={stats?.schemas.total ?? 0}
          helpText={stats?.schemas.total === 0 ? 'No schemas yet' : undefined}
          colorScheme="brand"
          isLoading={statsLoading}
        />

        <StatCard
          icon={<Icon as={HiOutlineInbox} boxSize={5} />}
          label="Submissions"
          value={stats?.submissions.total ?? 0}
          helpText={
            stats?.submissions.total === 0
              ? 'No submissions'
              : `${stats?.submissions.pending ?? 0} pending, ${stats?.submissions.draft ?? 0} draft`
          }
          colorScheme="brand"
          isLoading={statsLoading}
        />

        <StatCard
          icon={<Icon as={HiOutlineGlobeAlt} boxSize={5} />}
          label="Active Webhooks"
          value={stats?.webhooks.active ?? 0}
          helpText={stats?.webhooks.active === 0 ? 'No webhooks configured' : undefined}
          colorScheme="brand"
          isLoading={statsLoading}
        />

        <StatCard
          icon={<Icon as={HiOutlineCheckCircle} boxSize={5} />}
          label="Success Rate"
          value={successRate !== null ? `${successRate}%` : '-'}
          helpText={
            stats?.submissions.total === 0
              ? 'No data yet'
              : `${stats?.submissions.confirmed ?? 0} confirmed`
          }
          colorScheme={
            successRate === null
              ? 'brand'
              : successRate >= 80
                ? 'success'
                : successRate >= 50
                  ? 'warning'
                  : 'error'
          }
          isLoading={statsLoading}
        />
      </SimpleGrid>

      {(statsError || submissionsError) && (
        <VStack spacing={3} mb={6} align="stretch">
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
        </VStack>
      )}

      <RecentSubmissions
        submissions={submissionsData?.submissions ?? []}
        isLoading={submissionsLoading}
      />

      {!statsLoading && !hasData && (
        <Card variant="filled" mt={8}>
          <CardBody>
            <Text color="text.muted" textAlign="center">
              Get started by creating your first schema in the Schemas section.
            </Text>
          </CardBody>
        </Card>
      )}

      <CreateSubmissionModal isOpen={isOpen} onClose={onClose} />
    </Box>
  )
}
