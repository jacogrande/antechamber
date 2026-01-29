import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Skeleton,
} from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'
import { HiOutlineInbox } from 'react-icons/hi'
import type { Submission } from '@/types/submission'
import { SubmissionStatusBadge } from './SubmissionStatusBadge'
import { EmptyState } from '@/components/common/EmptyState'

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
      <Thead>
        <Tr>
          <Th>Website</Th>
          <Th>Schema</Th>
          <Th>Status</Th>
          <Th>Created</Th>
        </Tr>
      </Thead>
      <Tbody>
        {[1, 2, 3, 4, 5].map((i) => (
          <Tr key={i}>
            <Td><Skeleton h={4} w="120px" /></Td>
            <Td><Skeleton h={4} w="100px" /></Td>
            <Td><Skeleton h={5} w="80px" /></Td>
            <Td><Skeleton h={4} w="60px" /></Td>
          </Tr>
        ))}
      </Tbody>
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
    <Card variant="outline">
      <CardHeader pb={2}>
        <Heading size="sm">Recent Submissions</Heading>
      </CardHeader>
      <CardBody pt={0}>
        {isLoading ? (
          <LoadingSkeleton />
        ) : submissions.length === 0 ? (
          <EmptyState
            icon={HiOutlineInbox}
            title="No submissions yet"
            description="Submissions will appear here once you start processing website data."
          />
        ) : (
          <Box overflowX="auto">
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Website</Th>
                  <Th>Schema</Th>
                  <Th>Status</Th>
                  <Th>Created</Th>
                </Tr>
              </Thead>
              <Tbody>
                {submissions.map((submission) => (
                  <Tr
                    key={submission.id}
                    onClick={() => handleRowClick(submission.id)}
                    cursor="pointer"
                    _hover={{ bg: 'bg.subtle' }}
                    transition="background 0.15s"
                  >
                    <Td>
                      <Text
                        fontFamily="mono"
                        fontSize="sm"
                        color="text.default"
                        title={submission.websiteUrl}
                      >
                        {truncateUrl(submission.websiteUrl)}
                      </Text>
                    </Td>
                    <Td>
                      <Text color="text.muted" fontSize="sm">
                        {submission.schemaName ?? 'Unknown'}
                      </Text>
                    </Td>
                    <Td>
                      <SubmissionStatusBadge status={submission.status} />
                    </Td>
                    <Td>
                      <Text color="text.subtle" fontSize="sm">
                        {formatRelativeTime(submission.createdAt)}
                      </Text>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </CardBody>
    </Card>
  )
}
