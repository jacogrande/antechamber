import { Box, useToast } from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'
import { SchemaBuilderProvider } from '@/components/schemas/SchemaBuilderProvider'
import { SchemaBuilder } from '@/components/schemas/SchemaBuilder'
import { useCreateSchema } from '@/hooks/useSchemas'
import { useSchemaBuilderContext } from '@/components/schemas/SchemaBuilderProvider'

function SchemaCreateContent() {
  const navigate = useNavigate()
  const toast = useToast()
  const { state } = useSchemaBuilderContext()
  const createSchema = useCreateSchema()

  const handleSave = async () => {
    try {
      const result = await createSchema.mutateAsync({
        name: state.name,
        fields: state.fields,
      })
      toast({
        title: 'Schema created',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
      navigate(`/schemas/${result.schema.id}`)
    } catch (error) {
      toast({
        title: 'Failed to create schema',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  const handleCancel = () => {
    navigate('/schemas')
  }

  return (
    <Box h="calc(100vh - 64px)" mx={-6} mb={-6}>
      <SchemaBuilder
        onSave={handleSave}
        onCancel={handleCancel}
        isSaving={createSchema.isPending}
        saveLabel="Create Schema"
      />
    </Box>
  )
}

export function SchemaCreate() {
  return (
    <SchemaBuilderProvider>
      <SchemaCreateContent />
    </SchemaBuilderProvider>
  )
}
