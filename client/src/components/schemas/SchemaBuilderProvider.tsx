import { createContext, useContext, type ReactNode } from 'react'
import { useSchemaBuilder, type BuilderState } from '@/hooks/useSchemaBuilder'
import type { FieldDefinition, FieldType } from '@/types/schema'

interface SchemaBuilderContextValue {
  state: BuilderState
  selectedField: FieldDefinition | null
  canUndo: boolean
  canRedo: boolean
  setName: (name: string) => void
  addField: (fieldType: FieldType) => void
  updateField: (index: number, field: Partial<FieldDefinition>) => void
  deleteField: (index: number) => void
  reorderFields: (fromIndex: number, toIndex: number) => void
  selectField: (index: number | null) => void
  duplicateField: (index: number) => void
  loadSchema: (name: string, fields: FieldDefinition[]) => void
  markClean: () => void
  reset: () => void
  undo: () => void
  redo: () => void
}

const SchemaBuilderContext = createContext<SchemaBuilderContextValue | null>(null)

interface SchemaBuilderProviderProps {
  children: ReactNode
  initialName?: string
  initialFields?: FieldDefinition[]
}

export function SchemaBuilderProvider({
  children,
  initialName,
  initialFields,
}: SchemaBuilderProviderProps) {
  const builder = useSchemaBuilder(
    initialName !== undefined && initialFields !== undefined
      ? { name: initialName, fields: initialFields }
      : undefined
  )

  return (
    <SchemaBuilderContext.Provider value={builder}>
      {children}
    </SchemaBuilderContext.Provider>
  )
}

export function useSchemaBuilderContext() {
  const context = useContext(SchemaBuilderContext)
  if (!context) {
    throw new Error('useSchemaBuilderContext must be used within a SchemaBuilderProvider')
  }
  return context
}
