import { useReducer, useCallback } from 'react'
import type { FieldDefinition, FieldType } from '@/types/schema'

export interface BuilderState {
  name: string
  fields: FieldDefinition[]
  selectedIndex: number | null
  isDirty: boolean
}

export type BuilderAction =
  | { type: 'SET_NAME'; name: string }
  | { type: 'ADD_FIELD'; fieldType: FieldType }
  | { type: 'UPDATE_FIELD'; index: number; field: Partial<FieldDefinition> }
  | { type: 'DELETE_FIELD'; index: number }
  | { type: 'REORDER_FIELDS'; fromIndex: number; toIndex: number }
  | { type: 'SELECT_FIELD'; index: number | null }
  | { type: 'DUPLICATE_FIELD'; index: number }
  | { type: 'LOAD_SCHEMA'; name: string; fields: FieldDefinition[] }
  | { type: 'MARK_CLEAN' }
  | { type: 'RESET' }

function generateKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 100)
}

function getDefaultLabel(fieldType: FieldType): string {
  const labels: Record<FieldType, string> = {
    string: 'New Text Field',
    number: 'New Number Field',
    boolean: 'New Yes/No Field',
    enum: 'New Choice Field',
    'string[]': 'New List Field',
  }
  return labels[fieldType]
}

function createField(fieldType: FieldType, existingKeys: string[]): FieldDefinition {
  const baseLabel = getDefaultLabel(fieldType)
  let label = baseLabel
  let key = generateKey(label)
  let counter = 1

  while (existingKeys.includes(key)) {
    counter++
    label = `${baseLabel} ${counter}`
    key = generateKey(label)
  }

  const field: FieldDefinition = {
    key,
    label,
    type: fieldType,
    required: false,
    instructions: '',
  }

  if (fieldType === 'enum') {
    field.enumOptions = ['Option 1', 'Option 2']
  }

  return field
}

function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'SET_NAME':
      return {
        ...state,
        name: action.name,
        isDirty: true,
      }

    case 'ADD_FIELD': {
      const existingKeys = state.fields.map((f) => f.key)
      const newField = createField(action.fieldType, existingKeys)
      const newFields = [...state.fields, newField]
      return {
        ...state,
        fields: newFields,
        selectedIndex: newFields.length - 1,
        isDirty: true,
      }
    }

    case 'UPDATE_FIELD': {
      const fields = [...state.fields]
      const currentField = fields[action.index]
      const updatedField = { ...currentField, ...action.field }

      // Auto-generate key from label if label changed and key matches old auto-generated key
      if (
        action.field.label &&
        action.field.label !== currentField.label &&
        currentField.key === generateKey(currentField.label)
      ) {
        const newKey = generateKey(action.field.label)
        const otherKeys = fields
          .filter((_, i) => i !== action.index)
          .map((f) => f.key)
        if (!otherKeys.includes(newKey)) {
          updatedField.key = newKey
        }
      }

      fields[action.index] = updatedField
      return {
        ...state,
        fields,
        isDirty: true,
      }
    }

    case 'DELETE_FIELD': {
      const fields = state.fields.filter((_, i) => i !== action.index)
      let selectedIndex = state.selectedIndex

      if (selectedIndex !== null) {
        if (selectedIndex === action.index) {
          selectedIndex = fields.length > 0 ? Math.min(action.index, fields.length - 1) : null
        } else if (selectedIndex > action.index) {
          selectedIndex--
        }
      }

      return {
        ...state,
        fields,
        selectedIndex,
        isDirty: true,
      }
    }

    case 'REORDER_FIELDS': {
      const fields = [...state.fields]
      const [movedField] = fields.splice(action.fromIndex, 1)
      fields.splice(action.toIndex, 0, movedField)

      let selectedIndex = state.selectedIndex
      if (selectedIndex === action.fromIndex) {
        selectedIndex = action.toIndex
      } else if (selectedIndex !== null) {
        if (action.fromIndex < selectedIndex && action.toIndex >= selectedIndex) {
          selectedIndex--
        } else if (action.fromIndex > selectedIndex && action.toIndex <= selectedIndex) {
          selectedIndex++
        }
      }

      return {
        ...state,
        fields,
        selectedIndex,
        isDirty: true,
      }
    }

    case 'SELECT_FIELD':
      return {
        ...state,
        selectedIndex: action.index,
      }

    case 'DUPLICATE_FIELD': {
      const original = state.fields[action.index]
      const existingKeys = state.fields.map((f) => f.key)
      let newKey = `${original.key}_copy`
      let counter = 1

      while (existingKeys.includes(newKey)) {
        counter++
        newKey = `${original.key}_copy_${counter}`
      }

      const duplicate: FieldDefinition = {
        ...original,
        key: newKey,
        label: `${original.label} (Copy)`,
      }

      const fields = [...state.fields]
      fields.splice(action.index + 1, 0, duplicate)

      return {
        ...state,
        fields,
        selectedIndex: action.index + 1,
        isDirty: true,
      }
    }

    case 'LOAD_SCHEMA':
      return {
        name: action.name,
        fields: action.fields,
        selectedIndex: action.fields.length > 0 ? 0 : null,
        isDirty: false,
      }

    case 'MARK_CLEAN':
      return {
        ...state,
        isDirty: false,
      }

    case 'RESET':
      return {
        name: '',
        fields: [],
        selectedIndex: null,
        isDirty: false,
      }

    default:
      return state
  }
}

const initialState: BuilderState = {
  name: '',
  fields: [],
  selectedIndex: null,
  isDirty: false,
}

export function useSchemaBuilder(initial?: { name: string; fields: FieldDefinition[] }) {
  const [state, dispatch] = useReducer(
    builderReducer,
    initial
      ? {
          name: initial.name,
          fields: initial.fields,
          selectedIndex: initial.fields.length > 0 ? 0 : null,
          isDirty: false,
        }
      : initialState
  )

  const setName = useCallback((name: string) => {
    dispatch({ type: 'SET_NAME', name })
  }, [])

  const addField = useCallback((fieldType: FieldType) => {
    dispatch({ type: 'ADD_FIELD', fieldType })
  }, [])

  const updateField = useCallback((index: number, field: Partial<FieldDefinition>) => {
    dispatch({ type: 'UPDATE_FIELD', index, field })
  }, [])

  const deleteField = useCallback((index: number) => {
    dispatch({ type: 'DELETE_FIELD', index })
  }, [])

  const reorderFields = useCallback((fromIndex: number, toIndex: number) => {
    dispatch({ type: 'REORDER_FIELDS', fromIndex, toIndex })
  }, [])

  const selectField = useCallback((index: number | null) => {
    dispatch({ type: 'SELECT_FIELD', index })
  }, [])

  const duplicateField = useCallback((index: number) => {
    dispatch({ type: 'DUPLICATE_FIELD', index })
  }, [])

  const loadSchema = useCallback((name: string, fields: FieldDefinition[]) => {
    dispatch({ type: 'LOAD_SCHEMA', name, fields })
  }, [])

  const markClean = useCallback(() => {
    dispatch({ type: 'MARK_CLEAN' })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  const selectedField = state.selectedIndex !== null ? state.fields[state.selectedIndex] : null

  return {
    state,
    selectedField,
    setName,
    addField,
    updateField,
    deleteField,
    reorderFields,
    selectField,
    duplicateField,
    loadSchema,
    markClean,
    reset,
  }
}
