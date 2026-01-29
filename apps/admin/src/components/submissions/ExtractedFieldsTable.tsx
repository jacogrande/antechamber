import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Badge,
  Box,
  HStack,
  Tooltip,
  Icon,
  Link,
} from '@chakra-ui/react'
import { HiOutlineExternalLink, HiOutlineInformationCircle } from 'react-icons/hi'
import type { ExtractedFieldValue, ExtractedFieldStatus } from '@/types/submission'

interface ExtractedFieldsTableProps {
  fields: ExtractedFieldValue[]
}

const statusConfig: Record<
  ExtractedFieldStatus,
  { label: string; variant: string }
> = {
  found: { label: 'Found', variant: 'success' },
  not_found: { label: 'Not Found', variant: 'subtle' },
  unknown: { label: 'Unknown', variant: 'warning' },
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '-'
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  if (Array.isArray(value)) {
    return value.join(', ')
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

export function ExtractedFieldsTable({ fields }: ExtractedFieldsTableProps) {
  if (fields.length === 0) {
    return (
      <Text color="text.muted" fontSize="sm">
        No fields extracted yet.
      </Text>
    )
  }

  return (
    <Box overflowX="auto">
      <Table size="sm">
        <Thead>
          <Tr>
            <Th>Field</Th>
            <Th>Value</Th>
            <Th>Status</Th>
            <Th>Citations</Th>
          </Tr>
        </Thead>
        <Tbody>
          {fields.map((field) => {
            const status = statusConfig[field.status]
            return (
              <Tr key={field.fieldKey}>
                <Td>
                  <Box>
                    <Text fontWeight="medium">{field.fieldLabel}</Text>
                    <Text fontSize="xs" color="text.muted" fontFamily="mono">
                      {field.fieldKey}
                    </Text>
                  </Box>
                </Td>
                <Td>
                  <Text
                    maxW="300px"
                    isTruncated
                    title={formatValue(field.value)}
                  >
                    {formatValue(field.value)}
                  </Text>
                </Td>
                <Td>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </Td>
                <Td>
                  {field.citations.length > 0 ? (
                    <HStack spacing={1}>
                      {field.citations.map((citation, idx) => (
                        <Tooltip
                          key={idx}
                          label={
                            <Box>
                              <Text fontWeight="bold" mb={1}>
                                {citation.sourceUrl}
                              </Text>
                              <Text fontSize="sm">"{citation.snippetText}"</Text>
                              <Text fontSize="xs" mt={1}>
                                Confidence: {Math.round(citation.confidence * 100)}%
                              </Text>
                            </Box>
                          }
                          placement="top"
                          hasArrow
                        >
                          <Link
                            href={citation.sourceUrl}
                            isExternal
                            color="brand.500"
                            display="inline-flex"
                            alignItems="center"
                          >
                            <Icon as={HiOutlineExternalLink} boxSize={4} />
                          </Link>
                        </Tooltip>
                      ))}
                      <Text fontSize="xs" color="text.muted">
                        ({field.citations.length})
                      </Text>
                    </HStack>
                  ) : (
                    <HStack spacing={1} color="text.subtle">
                      <Icon as={HiOutlineInformationCircle} boxSize={4} />
                      <Text fontSize="xs">None</Text>
                    </HStack>
                  )}
                </Td>
              </Tr>
            )
          })}
        </Tbody>
      </Table>
    </Box>
  )
}
