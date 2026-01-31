import { useReducer, useCallback } from 'react'
import type { FieldDefinition, FieldType } from '@/types/schema'
import type { UndoAction, UndoHistory } from '@/domain/undo/models/undo-action'
import * as undoHistory from '@/domain/undo/services/undo-history'

export interface BuilderState {
  name: string
  fields: FieldDefinition[]
  selectedIndex: number | null
  isDirty: boolean
  history: UndoHistory
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
  | { type: 'UNDO' }
  | { type: 'REDO' }

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

function applyUndoAction(state: BuilderState, action: UndoAction): BuilderState {
  switch (action.type) {
    case 'add': {
      // Undo add = delete the field
      const fields = state.fields.filter((_, i) => i !== action.insertIndex)
      let selectedIndex = state.selectedIndex
      if (selectedIndex !== null) {
        if (selectedIndex === action.insertIndex) {
          selectedIndex = fields.length > 0 ? Math.min(action.insertIndex, fields.length - 1) : null
        } else if (selectedIndex > action.insertIndex) {
          selectedIndex--
        }
      }
      return { ...state, fields, selectedIndex, isDirty: true }
    }
    case 'delete': {
      // Undo delete = restore the field
      const fields = [...state.fields]
      fields.splice(action.index, 0, action.field)
      return { ...state, fields, selectedIndex: action.index, isDirty: true }
    }
    case 'update': {
      // Undo update = restore previous field
      const fields = [...state.fields]
      fields[action.index] = action.previousField
      return { ...state, fields, isDirty: true }
    }
    case 'reorder': {
      // Undo reorder = reverse the reorder
      const fields = [...state.fields]
      const [movedField] = fields.splice(action.toIndex, 1)
      fields.splice(action.fromIndex, 0, movedField)
      let selectedIndex = state.selectedIndex
      if (selectedIndex === action.toIndex) {
        selectedIndex = action.fromIndex
      }
      return { ...state, fields, selectedIndex, isDirty: true }
    }
    case 'duplicate': {
      // Undo duplicate = delete the duplicate
      const fields = state.fields.filter((_, i) => i !== action.insertIndex)
      let selectedIndex = state.selectedIndex
      if (selectedIndex !== null && selectedIndex >= action.insertIndex) {
        selectedIndex = selectedIndex > action.insertIndex ? selectedIndex - 1 : action.insertIndex - 1
      }
      return { ...state, fields, selectedIndex, isDirty: true }
    }
    case 'setName': {
      // Undo setName = restore previous name
      return { ...state, name: action.previousName, isDirty: true }
    }
    default:
      return state
  }
}

function applyRedoAction(state: BuilderState, action: UndoAction): BuilderState {
  switch (action.type) {
    case 'add': {
      // Redo add = add the field back
      const fields = [...state.fields]
      fields.splice(action.insertIndex, 0, action.field)
      return { ...state, fields, selectedIndex: action.insertIndex, isDirty: true }
    }
    case 'delete': {
      // Redo delete = delete again
      const fields = state.fields.filter((_, i) => i !== action.index)
      let selectedIndex = state.selectedIndex
      if (selectedIndex !== null) {
        if (selectedIndex === action.index) {
          selectedIndex = fields.length > 0 ? Math.min(action.index, fields.length - 1) : null
        } else if (selectedIndex > action.index) {
          selectedIndex--
        }
      }
      return { ...state, fields, selectedIndex, isDirty: true }
    }
    case 'update': {
      // Redo update = apply the new field
      const fields = [...state.fields]
      fields[action.index] = action.newField
      return { ...state, fields, isDirty: true }
    }
    case 'reorder': {
      // Redo reorder = reorder again
      const fields = [...state.fields]
      const [movedField] = fields.splice(action.fromIndex, 1)
      fields.splice(action.toIndex, 0, movedField)
      let selectedIndex = state.selectedIndex
      if (selectedIndex === action.fromIndex) {
        selectedIndex = action.toIndex
      }
      return { ...state, fields, selectedIndex, isDirty: true }
    }
    case 'duplicate': {
      // Redo duplicate = add the duplicate back
      const fields = [...state.fields]
      fields.splice(action.insertIndex, 0, action.field)
      return { ...state, fields, selectedIndex: action.insertIndex, isDirty: true }
    }
    case 'setName': {
      // Redo setName = apply new name
      return { ...state, name: action.newName, isDirty: true }
    }
    default:
      return state
  }
}

function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'SET_NAME': {
      const undoAction: UndoAction = {
        type: 'setName',
        previousName: state.name,
        newName: action.name,
        inverse: { type: 'setName' },
      }
      return {
        ...state,
        name: action.name,
        isDirty: true,
        history: undoHistory.pushAction(state.history, undoAction),
      }
    }

    case 'ADD_FIELD': {
      const existingKeys = state.fields.map((f) => f.key)
      const newField = createField(action.fieldType, existingKeys)
      const newFields = [...state.fields, newField]
      const insertIndex = newFields.length - 1

      const undoAction: UndoAction = {
        type: 'add',
        field: newField,
        insertIndex,
        inverse: { type: 'delete' },
      }

      return {
        ...state,
        fields: newFields,
        selectedIndex: insertIndex,
        isDirty: true,
        history: undoHistory.pushAction(state.history, undoAction),
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

      const undoAction: UndoAction = {
        type: 'update',
        index: action.index,
        previousField: currentField,
        newField: updatedField,
        inverse: { type: 'update' },
      }

      return {
        ...state,
        fields,
        isDirty: true,
        history: undoHistory.pushAction(state.history, undoAction),
      }
    }

    case 'DELETE_FIELD': {
      const deletedField = state.fields[action.index]
      const fields = state.fields.filter((_, i) => i !== action.index)
      let selectedIndex = state.selectedIndex

      if (selectedIndex !== null) {
        if (selectedIndex === action.index) {
          selectedIndex = fields.length > 0 ? Math.min(action.index, fields.length - 1) : null
        } else if (selectedIndex > action.index) {
          selectedIndex--
        }
      }

      const undoAction: UndoAction = {
        type: 'delete',
        field: deletedField,
        index: action.index,
        inverse: { type: 'add' },
      }

      return {
        ...state,
        fields,
        selectedIndex,
        isDirty: true,
        history: undoHistory.pushAction(state.history, undoAction),
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

      const undoAction: UndoAction = {
        type: 'reorder',
        fromIndex: action.fromIndex,
        toIndex: action.toIndex,
        inverse: { type: 'reorder' },
      }

      return {
        ...state,
        fields,
        selectedIndex,
        isDirty: true,
        history: undoHistory.pushAction(state.history, undoAction),
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
      const insertIndex = action.index + 1
      fields.splice(insertIndex, 0, duplicate)

      const undoAction: UndoAction = {
        type: 'duplicate',
        field: duplicate,
        insertIndex,
        inverse: { type: 'delete' },
      }

      return {
        ...state,
        fields,
        selectedIndex: insertIndex,
        isDirty: true,
        history: undoHistory.pushAction(state.history, undoAction),
      }
    }

    case 'LOAD_SCHEMA':
      return {
        name: action.name,
        fields: action.fields,
        selectedIndex: action.fields.length > 0 ? 0 : null,
        isDirty: false,
        history: undoHistory.createHistory(),
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
        history: undoHistory.createHistory(),
      }

    case 'UNDO': {
      const result = undoHistory.undo(state.history)
      if (result.isErr) {
        return state
      }
      const { action: undoAction, history } = result.value
      const newState = applyUndoAction(state, undoAction)
      return { ...newState, history }
    }

    case 'REDO': {
      const result = undoHistory.redo(state.history)
      if (result.isErr) {
        return state
      }
      const { action: redoAction, history } = result.value
      const newState = applyRedoAction(state, redoAction)
      return { ...newState, history }
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
  history: undoHistory.createHistory(),
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
          history: undoHistory.createHistory(),
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

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' })
  }, [])

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' })
  }, [])

  const selectedField = state.selectedIndex !== null ? state.fields[state.selectedIndex] : null
  const canUndo = undoHistory.canUndo(state.history)
  const canRedo = undoHistory.canRedo(state.history)

  return {
    state,
    selectedField,
    canUndo,
    canRedo,
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
    undo,
    redo,
  }
}
