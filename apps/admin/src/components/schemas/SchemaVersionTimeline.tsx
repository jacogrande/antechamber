import {
  VStack,
  HStack,
  Box,
  Text,
  Badge,
  Button,
} from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'
import type { SchemaVersion } from '@/types/schema'

interface SchemaVersionTimelineProps {
  schemaId: string
  versions: SchemaVersion[]
  currentVersion: number
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function SchemaVersionTimeline({
  schemaId,
  versions,
  currentVersion,
}: SchemaVersionTimelineProps) {
  const navigate = useNavigate()

  return (
    <VStack spacing={0} align="stretch">
      {versions.map((version, index) => {
        const isLatest = index === 0
        const isCurrent = version.version === currentVersion

        return (
          <HStack
            key={version.id}
            spacing={3}
            p={3}
            bg={isCurrent ? 'blue.50' : 'transparent'}
            borderRadius="md"
            _dark={{
              bg: isCurrent ? 'blue.900' : 'transparent',
            }}
          >
            <Box
              w={2}
              h={2}
              borderRadius="full"
              bg={isLatest ? 'brand.500' : 'gray.300'}
              flexShrink={0}
            />
            <VStack flex={1} align="start" spacing={0}>
              <HStack>
                <Text fontWeight="medium" fontSize="sm">
                  Version {version.version}
                </Text>
                {isLatest && (
                  <Badge colorScheme="green" size="sm">
                    Latest
                  </Badge>
                )}
              </HStack>
              <Text fontSize="xs" color="text.muted">
                {formatDate(version.createdAt)} - {version.fields.length} fields
              </Text>
            </VStack>
            <Button
              size="xs"
              variant="ghost"
              onClick={() =>
                navigate(`/schemas/${schemaId}/versions/${version.version}`)
              }
            >
              View
            </Button>
          </HStack>
        )
      })}
    </VStack>
  )
}
