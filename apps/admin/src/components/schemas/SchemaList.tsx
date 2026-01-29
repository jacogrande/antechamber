import { SimpleGrid } from '@chakra-ui/react'
import { SchemaCard } from './SchemaCard'
import type { Schema } from '@/types/schema'

interface SchemaListProps {
  schemas: Schema[]
}

export function SchemaList({ schemas }: SchemaListProps) {
  return (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
      {schemas.map((schema) => (
        <SchemaCard key={schema.id} schema={schema} />
      ))}
    </SimpleGrid>
  )
}
