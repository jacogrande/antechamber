import {
  Card,
  CardBody,
  Heading,
  Text,
  HStack,
  VStack,
  Badge,
} from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'
import type { Schema } from '@/types/schema'

interface SchemaCardProps {
  schema: Schema
  fieldCount?: number
  latestVersion?: number
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function SchemaCard({ schema, fieldCount, latestVersion }: SchemaCardProps) {
  const navigate = useNavigate()

  return (
    <Card
      variant="outline"
      cursor="pointer"
      transition="all 0.2s"
      _hover={{
        borderColor: 'brand.500',
        shadow: 'sm',
      }}
      onClick={() => navigate(`/schemas/${schema.id}`)}
    >
      <CardBody>
        <VStack align="stretch" spacing={3}>
          <Heading size="sm" noOfLines={1}>
            {schema.name}
          </Heading>
          <HStack spacing={2} flexWrap="wrap">
            {latestVersion !== undefined && (
              <Badge colorScheme="blue" variant="subtle">
                v{latestVersion}
              </Badge>
            )}
            {fieldCount !== undefined && (
              <Badge colorScheme="gray" variant="subtle">
                {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
              </Badge>
            )}
          </HStack>
          <Text fontSize="sm" color="text.muted">
            Updated {formatDate(schema.updatedAt)}
          </Text>
        </VStack>
      </CardBody>
    </Card>
  )
}
