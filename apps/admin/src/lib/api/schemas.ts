import { apiGet, apiPost, apiDelete } from './client'
import type {
  Schema,
  SchemaWithVersions,
  SchemasListResponse,
  SchemaResponse,
  SchemaVersionResponse,
  FieldDefinition,
} from '@/types/schema'

export async function listSchemas(): Promise<Schema[]> {
  const response = await apiGet<SchemasListResponse>('/schemas')
  return response.schemas
}

export async function getSchema(schemaId: string): Promise<SchemaWithVersions> {
  return apiGet<SchemaWithVersions>(`/schemas/${schemaId}`)
}

export async function getSchemaVersion(
  schemaId: string,
  version: number
): Promise<SchemaVersionResponse> {
  return apiGet<SchemaVersionResponse>(`/schemas/${schemaId}/versions/${version}`)
}

export interface CreateSchemaInput {
  name: string
  fields: FieldDefinition[]
}

export async function createSchema(input: CreateSchemaInput): Promise<SchemaResponse> {
  return apiPost<SchemaResponse>('/schemas', input)
}

export interface CreateSchemaVersionInput {
  fields: FieldDefinition[]
}

export async function createSchemaVersion(
  schemaId: string,
  input: CreateSchemaVersionInput
): Promise<SchemaVersionResponse> {
  return apiPost<SchemaVersionResponse>(`/schemas/${schemaId}/versions`, input)
}

export async function deleteSchema(schemaId: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/schemas/${schemaId}`)
}
