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
  Badge,
  Alert,
  AlertIcon,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
} from '@chakra-ui/react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { HiPlus, HiChevronRight } from 'react-icons/hi'
import { useSchema } from '@/hooks/useSchemas'
import { LoadingSpinner } from '@/components/common'
import { FieldTypeIcon, getFieldTypeLabel } from '@/components/schemas/FieldTypeIcon'
import { SchemaVersionTimeline } from '@/components/schemas/SchemaVersionTimeline'

export function SchemaDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading, error } = useSchema(id)

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error || !data) {
    return (
      <Alert status="error">
        <AlertIcon />
        Failed to load schema. Please try again.
      </Alert>
    )
  }

  const { schema, latestVersion, versions } = data

  return (
    <Box>
      <Breadcrumb separator={<HiChevronRight />} mb={4} fontSize="sm" color="text.muted">
        <BreadcrumbItem>
          <BreadcrumbLink as={Link} to="/schemas">
            Schemas
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          <BreadcrumbLink>{schema.name}</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      <HStack justify="space-between" mb={6}>
        <Box>
          <Heading size="lg">{schema.name}</Heading>
          {latestVersion && (
            <Text color="text.muted" mt={1}>
              Version {latestVersion.version} - {latestVersion.fields.length} fields
            </Text>
          )}
        </Box>
        <Button
          leftIcon={<HiPlus />}
          variant="primary"
          onClick={() => navigate(`/schemas/${id}/versions/new`)}
        >
          New Version
        </Button>
      </HStack>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        {/* Fields Card */}
        <Card variant="outline">
          <CardHeader>
            <Heading size="sm">Fields</Heading>
          </CardHeader>
          <CardBody pt={0}>
            {latestVersion ? (
              <VStack spacing={3} align="stretch">
                {latestVersion.fields.map((field) => (
                  <HStack
                    key={field.key}
                    p={3}
                    bg="bg.subtle"
                    borderRadius="md"
                    justify="space-between"
                  >
                    <HStack spacing={3}>
                      <FieldTypeIcon type={field.type} color="text.muted" />
                      <Box>
                        <Text fontWeight="medium">{field.label}</Text>
                        <Text fontSize="xs" color="text.muted">
                          {field.key} - {getFieldTypeLabel(field.type)}
                        </Text>
                      </Box>
                    </HStack>
                    <HStack spacing={2}>
                      {field.required && (
                        <Badge colorScheme="red" variant="subtle" size="sm">
                          Required
                        </Badge>
                      )}
                    </HStack>
                  </HStack>
                ))}
              </VStack>
            ) : (
              <Text color="text.muted">No fields defined yet.</Text>
            )}
          </CardBody>
        </Card>

        {/* Version History Card */}
        <Card variant="outline">
          <CardHeader>
            <Heading size="sm">Version History</Heading>
          </CardHeader>
          <CardBody pt={0}>
            {versions.length > 0 ? (
              <SchemaVersionTimeline
                schemaId={schema.id}
                versions={versions}
                currentVersion={latestVersion?.version ?? 0}
              />
            ) : (
              <Text color="text.muted">No versions yet.</Text>
            )}
          </CardBody>
        </Card>
      </SimpleGrid>
    </Box>
  )
}
