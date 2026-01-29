import { Box, Heading, Button, Flex, Alert, AlertIcon } from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'
import { HiOutlineDocumentText, HiPlus } from 'react-icons/hi'
import { useSchemas } from '@/hooks/useSchemas'
import { SchemaList } from '@/components/schemas/SchemaList'
import { EmptyState, LoadingSpinner } from '@/components/common'

export function Schemas() {
  const navigate = useNavigate()
  const { data: schemas, isLoading, error } = useSchemas()

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        Failed to load schemas. Please try again.
      </Alert>
    )
  }

  const hasSchemas = schemas && schemas.length > 0

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">Schemas</Heading>
        {hasSchemas && (
          <Button
            leftIcon={<HiPlus />}
            variant="primary"
            onClick={() => navigate('/schemas/new')}
          >
            New Schema
          </Button>
        )}
      </Flex>

      {hasSchemas ? (
        <SchemaList schemas={schemas} />
      ) : (
        <EmptyState
          icon={HiOutlineDocumentText}
          title="No schemas yet"
          description="Create your first schema to define the fields you want to extract from websites."
          actionLabel="Create Schema"
          onAction={() => navigate('/schemas/new')}
        />
      )}
    </Box>
  )
}
