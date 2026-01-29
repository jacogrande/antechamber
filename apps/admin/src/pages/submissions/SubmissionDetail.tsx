import {
  Box,
  Heading,
  Text,
  Button,
  HStack,
  VStack,
  Card,
  CardHeader,
  CardBody,
  SimpleGrid,
  Alert,
  AlertIcon,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Link,
  Icon,
  useToast,
} from '@chakra-ui/react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import { HiChevronRight, HiOutlineExternalLink, HiCheck } from 'react-icons/hi'
import { useSubmission, useConfirmSubmission } from '@/hooks/useSubmissions'
import { LoadingSpinner, ConfirmDialog } from '@/components/common'
import { SubmissionStatusBadge } from '@/components/dashboard/SubmissionStatusBadge'
import { WorkflowProgress } from '@/components/submissions/WorkflowProgress'
import { ExtractedFieldsTable } from '@/components/submissions/ExtractedFieldsTable'
import { useState } from 'react'

export function SubmissionDetail() {
  const { id } = useParams<{ id: string }>()
  const toast = useToast()
  const { data, isLoading, error, refetch } = useSubmission(id)
  const confirmMutation = useConfirmSubmission()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const handleConfirm = async () => {
    if (!id) return

    try {
      await confirmMutation.mutateAsync(id)
      toast({
        title: 'Submission confirmed',
        description: 'The submission has been confirmed and exported.',
        status: 'success',
        duration: 5000,
      })
      setIsConfirmOpen(false)
    } catch (err) {
      toast({
        title: 'Failed to confirm submission',
        description: err instanceof Error ? err.message : 'An error occurred',
        status: 'error',
        duration: 5000,
      })
    }
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error || !data) {
    return (
      <Alert status="error">
        <AlertIcon />
        Failed to load submission.{' '}
        <Button variant="link" onClick={() => refetch()} ml={2}>
          Retry
        </Button>
      </Alert>
    )
  }

  const { submission } = data

  return (
    <Box>
      <Breadcrumb
        separator={<HiChevronRight />}
        mb={4}
        fontSize="sm"
        color="text.muted"
      >
        <BreadcrumbItem>
          <BreadcrumbLink as={RouterLink} to="/">
            Dashboard
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          <BreadcrumbLink>Submission</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      <HStack justify="space-between" mb={6} wrap="wrap" gap={4}>
        <Box>
          <HStack spacing={3} mb={1}>
            <Heading size="lg">Submission</Heading>
            <SubmissionStatusBadge status={submission.status} />
          </HStack>
          <Text color="text.muted">
            <Link href={submission.websiteUrl} isExternal color="brand.500">
              {submission.websiteUrl}
              <Icon as={HiOutlineExternalLink} ml={1} />
            </Link>
          </Text>
          <Text color="text.subtle" fontSize="sm" mt={1}>
            Created {new Date(submission.createdAt).toLocaleString()}
            {submission.schemaName && ` • Schema: ${submission.schemaName}`}
          </Text>
        </Box>
        {submission.status === 'draft' && (
          <Button
            leftIcon={<HiCheck />}
            variant="primary"
            onClick={() => setIsConfirmOpen(true)}
            isLoading={confirmMutation.isPending}
          >
            Confirm Submission
          </Button>
        )}
      </HStack>

      <SimpleGrid columns={{ base: 1, xl: 3 }} spacing={6}>
        {/* Workflow Progress */}
        <Card variant="outline">
          <CardHeader>
            <Heading size="sm">Workflow Progress</Heading>
          </CardHeader>
          <CardBody pt={0}>
            <WorkflowProgress steps={submission.workflowSteps} />
          </CardBody>
        </Card>

        {/* Extracted Fields */}
        <Card variant="outline" gridColumn={{ xl: 'span 2' }}>
          <CardHeader>
            <HStack justify="space-between">
              <Heading size="sm">Extracted Fields</Heading>
              <Text fontSize="sm" color="text.muted">
                {submission.extractedFields.filter((f) => f.status === 'found').length} /{' '}
                {submission.extractedFields.length} found
              </Text>
            </HStack>
          </CardHeader>
          <CardBody pt={0}>
            <ExtractedFieldsTable fields={submission.extractedFields} />
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Crawled Pages */}
      <Card variant="outline" mt={6}>
        <CardHeader>
          <Heading size="sm">Crawled Pages</Heading>
        </CardHeader>
        <CardBody pt={0}>
          {submission.artifacts.length === 0 ? (
            <Text color="text.muted" fontSize="sm">
              No pages crawled yet.
            </Text>
          ) : (
            <Box overflowX="auto">
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>URL</Th>
                    <Th>Page Type</Th>
                    <Th>Status</Th>
                    <Th>Fetched</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {submission.artifacts.map((artifact, idx) => (
                    <Tr key={idx}>
                      <Td>
                        <Link
                          href={artifact.url}
                          isExternal
                          color="brand.500"
                          maxW="400px"
                          display="block"
                          isTruncated
                        >
                          {artifact.url}
                          <Icon as={HiOutlineExternalLink} ml={1} />
                        </Link>
                      </Td>
                      <Td>
                        <Text textTransform="capitalize">
                          {artifact.pageType.replace(/_/g, ' ')}
                        </Text>
                      </Td>
                      <Td>
                        <Text
                          color={
                            artifact.statusCode >= 200 && artifact.statusCode < 300
                              ? 'green.500'
                              : 'red.500'
                          }
                        >
                          {artifact.statusCode}
                        </Text>
                      </Td>
                      <Td>
                        <Text color="text.subtle" fontSize="sm">
                          {new Date(artifact.fetchedAt).toLocaleString()}
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

      {/* Confirmation details */}
      {submission.status === 'confirmed' && submission.confirmedAt && (
        <Card variant="outline" mt={6}>
          <CardHeader>
            <Heading size="sm">Confirmation Details</Heading>
          </CardHeader>
          <CardBody pt={0}>
            <VStack align="start" spacing={1}>
              <Text>
                <Text as="span" fontWeight="medium">
                  Confirmed at:
                </Text>{' '}
                {new Date(submission.confirmedAt).toLocaleString()}
              </Text>
              {submission.confirmedBy && (
                <Text>
                  <Text as="span" fontWeight="medium">
                    Confirmed by:
                  </Text>{' '}
                  {submission.confirmedBy}
                </Text>
              )}
            </VStack>
          </CardBody>
        </Card>
      )}

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirm}
        title="Confirm Submission"
        message="Are you sure you want to confirm this submission? This will trigger webhook delivery and mark the submission as final."
        confirmLabel="Confirm"
        isLoading={confirmMutation.isPending}
      />
    </Box>
  )
}
