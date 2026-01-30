import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { SchemaBuilderProvider } from '@/components/schemas/SchemaBuilderProvider'
import { SchemaBuilder } from '@/components/schemas/SchemaBuilder'
import { useCreateSchema } from '@/hooks/useSchemas'
import { useSchemaBuilderContext } from '@/components/schemas/SchemaBuilderProvider'
import { useCelebration } from '@/hooks/useCelebration'

function SchemaCreateContent() {
  const navigate = useNavigate()
  const { state } = useSchemaBuilderContext()
  const createSchema = useCreateSchema()
  const { celebrate } = useCelebration()

  const handleSave = async () => {
    try {
      const result = await createSchema.mutateAsync({
        name: state.name,
        fields: state.fields,
      })
      celebrate('success')
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
  return (
    <SchemaBuilderProvider>
      <SchemaCreateContent />
    </SchemaBuilderProvider>
  )
}
