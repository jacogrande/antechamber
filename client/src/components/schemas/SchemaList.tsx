import { SchemaCard } from './SchemaCard'
import type { Schema } from '@/types/schema'

interface SchemaListProps {
  schemas: Schema[]
}

export function SchemaList({ schemas }: SchemaListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {schemas.map((schema) => (
        <SchemaCard key={schema.id} schema={schema} />
      ))}
    </div>
  )
}
