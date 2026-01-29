import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  Card,
  CardBody,
  Icon,
} from '@chakra-ui/react'
import {
  HiOutlineDocumentText,
  HiOutlineInbox,
  HiOutlineGlobeAlt,
  HiOutlineCheckCircle,
} from 'react-icons/hi'
import { useAuth } from '@/hooks/useAuth'
import { useStats, useSubmissions } from '@/hooks/useSubmissions'
import { StatCard, RecentSubmissions } from '@/components/dashboard'

export function Dashboard() {
  const { user } = useAuth()
  const { data: stats, isLoading: statsLoading } = useStats()
  const { data: submissionsData, isLoading: submissionsLoading } = useSubmissions({ limit: 5 })

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
      <Box mb={8}>
        <Heading size="lg" mb={2}>
          Welcome back
        </Heading>
        <Text color="text.muted">
          {user?.email}
        </Text>
      </Box>

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
    </Box>
  )
}
