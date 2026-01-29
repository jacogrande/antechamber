import { Box, useToast, Alert, AlertIcon } from '@chakra-ui/react'
import { useParams, useNavigate } from 'react-router-dom'
import { SchemaBuilderProvider } from '@/components/schemas/SchemaBuilderProvider'
import { SchemaBuilder } from '@/components/schemas/SchemaBuilder'
import { useSchemaBuilderContext } from '@/components/schemas/SchemaBuilderProvider'
import { useSchema, useCreateSchemaVersion } from '@/hooks/useSchemas'
import { LoadingSpinner } from '@/components/common'

function SchemaVersionCreateContent({ schemaId }: { schemaId: string }) {
  const navigate = useNavigate()
  const toast = useToast()
  const { state } = useSchemaBuilderContext()
  const createVersion = useCreateSchemaVersion(schemaId)

  const handleSave = async () => {
    try {
      await createVersion.mutateAsync({
        fields: state.fields,
      })
      toast({
        title: 'Version created',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
      navigate(`/schemas/${schemaId}`)
    } catch (error) {
      toast({
        title: 'Failed to create version',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  const handleCancel = () => {
    navigate(`/schemas/${schemaId}`)
  }

  return (
    <Box h="calc(100vh - 64px)" mx={-6} mb={-6}>
      <SchemaBuilder
        onSave={handleSave}
        onCancel={handleCancel}
        isSaving={createVersion.isPending}
        saveLabel="Create Version"
      />
    </Box>
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
      <Alert status="error">
        <AlertIcon />
        Failed to load schema. Please try again.
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
