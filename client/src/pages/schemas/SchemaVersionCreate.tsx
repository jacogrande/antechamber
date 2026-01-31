import { toast } from 'sonner'
import { useParams, useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { SchemaBuilderProvider } from '@/components/schemas/SchemaBuilderProvider'
import { SchemaBuilder } from '@/components/schemas/SchemaBuilder'
import { useSchemaBuilderContext } from '@/components/schemas/SchemaBuilderProvider'
import { useSchema, useCreateSchemaVersion } from '@/hooks/useSchemas'
import { LoadingSpinner } from '@/components/common'
import { Alert, AlertDescription } from '@/components/ui/alert'

function SchemaVersionCreateContent({ schemaId }: { schemaId: string }) {
  const navigate = useNavigate()
  const { state } = useSchemaBuilderContext()
  const createVersion = useCreateSchemaVersion(schemaId)

  const handleSave = async () => {
    try {
      await createVersion.mutateAsync({
        fields: state.fields,
      })
      toast.success('Version created')
      navigate(`/schemas/${schemaId}`)
    } catch (error) {
      toast.error('Failed to create version', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const handleCancel = () => {
    navigate(`/schemas/${schemaId}`)
  }

  return (
    <div className="h-[calc(100vh-64px)] -mx-6 -mb-6">
      <SchemaBuilder
        onSave={handleSave}
        onCancel={handleCancel}
        isSaving={createVersion.isPending}
        saveLabel="Create Version"
      />
    </div>
  )
}

export function SchemaVersionCreate() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, error } = useSchema(id)

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load schema. Please try again.
        </AlertDescription>
      </Alert>
    )
  }

  const { schema, latestVersion } = data

  return (
    <SchemaBuilderProvider
      initialName={schema.name}
      initialFields={latestVersion?.fields ?? []}
    >
      <SchemaVersionCreateContent schemaId={schema.id} />
    </SchemaBuilderProvider>
  )
}
