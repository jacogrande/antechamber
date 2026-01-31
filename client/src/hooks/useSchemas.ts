import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listSchemas,
  getSchema,
  getSchemaVersion,
  createSchema,
  createSchemaVersion,
  deleteSchema,
  type CreateSchemaInput,
  type CreateSchemaVersionInput,
} from '@/lib/api/schemas'

export const schemaKeys = {
  all: ['schemas'] as const,
  lists: () => [...schemaKeys.all, 'list'] as const,
  list: () => [...schemaKeys.lists()] as const,
  details: () => [...schemaKeys.all, 'detail'] as const,
  detail: (id: string) => [...schemaKeys.details(), id] as const,
  versions: (id: string) => [...schemaKeys.detail(id), 'versions'] as const,
  version: (id: string, version: number) => [...schemaKeys.versions(id), version] as const,
}

export function useSchemas() {
  return useQuery({
    queryKey: schemaKeys.list(),
    queryFn: listSchemas,
  })
}

export function useSchema(schemaId: string | undefined) {
  return useQuery({
    queryKey: schemaKeys.detail(schemaId!),
    queryFn: () => getSchema(schemaId!),
    enabled: !!schemaId,
  })
}

export function useSchemaVersion(schemaId: string | undefined, version: number | undefined) {
  return useQuery({
    queryKey: schemaKeys.version(schemaId!, version!),
    queryFn: () => getSchemaVersion(schemaId!, version!),
    enabled: !!schemaId && version !== undefined,
  })
}

export function useCreateSchema() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateSchemaInput) => createSchema(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schemaKeys.lists() })
    },
  })
}

export function useCreateSchemaVersion(schemaId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateSchemaVersionInput) => createSchemaVersion(schemaId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schemaKeys.detail(schemaId) })
    },
  })
}

export function useDeleteSchema() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (schemaId: string) => deleteSchema(schemaId),
    onSuccess: (_data, schemaId) => {
      // Invalidate lists to remove deleted schema
      queryClient.invalidateQueries({ queryKey: schemaKeys.lists() })
      // Remove the detail query from cache
      queryClient.removeQueries({ queryKey: schemaKeys.detail(schemaId) })
    },
  })
}
