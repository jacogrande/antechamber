import { toast } from 'sonner'
import { useNavigate, useLocation } from 'react-router-dom'
import { SchemaBuilderProvider } from '@/components/schemas/SchemaBuilderProvider'
import { SchemaBuilder } from '@/components/schemas/SchemaBuilder'
import { useCreateSchema } from '@/hooks/useSchemas'
import { useSchemaBuilderContext } from '@/components/schemas/SchemaBuilderProvider'
import type { FieldDefinition } from '@/types/schema'

interface TemplateState {
  template?: {
    name: string
    fields: FieldDefinition[]
  }
}

function SchemaCreateContent() {
  const navigate = useNavigate()
  const { state } = useSchemaBuilderContext()
  const createSchema = useCreateSchema()

  const handleSave = async () => {
    try {
      const result = await createSchema.mutateAsync({
        name: state.name,
        fields: state.fields,
      })
      toast.success('Schema created')
      navigate(`/schemas/${result.schema.id}`)
    } catch (error) {
      toast.error('Failed to create schema', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const handleCancel = () => {
    navigate('/schemas')
  }

  return (
    <div className="h-[calc(100vh-64px)] -mx-6 -mb-6">
      <SchemaBuilder
        onSave={handleSave}
        onCancel={handleCancel}
        isSaving={createSchema.isPending}
        saveLabel="Create Schema"
      />
    </div>
  )
}

export function SchemaCreate() {
  const location = useLocation()
  const locationState = location.state as TemplateState | null

  // If a template was passed via navigation state, use it as initial values
  const initialName = locationState?.template?.name ?? ''
  const initialFields = locationState?.template?.fields ?? []

  return (
    <SchemaBuilderProvider initialName={initialName} initialFields={initialFields}>
      <SchemaCreateContent />
    </SchemaBuilderProvider>
  )
}
