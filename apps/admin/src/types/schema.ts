export type FieldType = 'string' | 'number' | 'boolean' | 'enum' | 'string[]'

export interface FieldDefinition {
  key: string
  label: string
  type: FieldType
  required: boolean
  instructions: string
  enumOptions?: string[]
  validation?: {
    regex?: string
    minLen?: number
    maxLen?: number
  }
  confidenceThreshold?: number
  sourceHints?: string[]
}

export interface Schema {
  id: string
  tenantId: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface SchemaVersion {
  id: string
  schemaId: string
  version: number
  fields: FieldDefinition[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface SchemaWithVersions {
  schema: Schema
  latestVersion: SchemaVersion | null
  versions: SchemaVersion[]
}

export interface SchemasListResponse {
  schemas: Schema[]
}

export interface SchemaResponse {
  schema: Schema
  version: SchemaVersion
}

export interface SchemaVersionResponse {
  version: SchemaVersion
}
