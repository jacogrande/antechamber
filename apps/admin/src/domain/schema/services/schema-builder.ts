/**
 * Pure functions for schema building operations (Functional Core)
 *
 * All functions return Result types for explicit error handling.
 * State is never mutated - new state is always returned.
 */

import type { FieldDefinition, FieldType } from '@/types/schema'
import type { Result } from '@/lib/utils/result'
import type { ValidationError } from '@/lib/errors/validation-errors'
import { ok, err } from '@/lib/utils/result'
import * as errors from '@/lib/errors/validation-errors'

export interface SchemaBuilderState {
  readonly name: string
  readonly fields: readonly FieldDefinition[]
  readonly selectedIndex: number | null
  readonly isDirty: boolean
}

/**
 * Generates a key from a label
 */
export function generateKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 100)
}

/**
 * Gets the default label for a field type
 */
export function getDefaultLabel(fieldType: FieldType): string {
  const labels: Record<FieldType, string> = {
    string: 'New Text Field',
    number: 'New Number Field',
    boolean: 'New Yes/No Field',
    enum: 'New Choice Field',
    'string[]': 'New List Field',
  }
  return labels[fieldType]
}

/**
 * Creates a new field with a unique key
 */
export function createField(
  fieldType: FieldType,
  existingKeys: readonly string[]
): FieldDefinition {
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

/**
 * Adds a new field to the state
 */
export function addField(
  state: SchemaBuilderState,
  fieldType: FieldType
): Result<{ state: SchemaBuilderState; field: FieldDefinition }, ValidationError> {
  const existingKeys = state.fields.map((f) => f.key)
  const newField = createField(fieldType, existingKeys)
  const newFields = [...state.fields, newField]

  return ok({
    state: {
      ...state,
      fields: newFields,
      selectedIndex: newFields.length - 1,
      isDirty: true,
    },
    field: newField,
  })
}

/**
 * Removes a field at the given index
 */
export function removeField(
  state: SchemaBuilderState,
  index: number
): Result<{ state: SchemaBuilderState; field: FieldDefinition; index: number }, ValidationError> {
  if (index < 0 || index >= state.fields.length) {
    return err(errors.invalidIndex(index, state.fields.length))
  }

  const field = state.fields[index]
  const fields = state.fields.filter((_, i) => i !== index)
  let selectedIndex = state.selectedIndex

  if (selectedIndex !== null) {
    if (selectedIndex === index) {
      selectedIndex = fields.length > 0 ? Math.min(index, fields.length - 1) : null
    } else if (selectedIndex > index) {
      selectedIndex--
    }
  }

  return ok({
    state: {
      ...state,
      fields,
      selectedIndex,
      isDirty: true,
    },
    field,
    index,
  })
}

/**
 * Updates a field at the given index
 */
export function updateField(
  state: SchemaBuilderState,
  index: number,
  updates: Partial<FieldDefinition>
): Result<{ state: SchemaBuilderState; previousField: FieldDefinition }, ValidationError> {
  if (index < 0 || index >= state.fields.length) {
    return err(errors.invalidIndex(index, state.fields.length))
  }

  const currentField = state.fields[index]
  const updatedField = { ...currentField, ...updates }

  // Auto-generate key from label if label changed and key matches old auto-generated key
  if (
    updates.label &&
    updates.label !== currentField.label &&
    currentField.key === generateKey(currentField.label)
  ) {
    const newKey = generateKey(updates.label)
    const otherKeys = state.fields
      .filter((_, i) => i !== index)
      .map((f) => f.key)
    if (!otherKeys.includes(newKey)) {
      updatedField.key = newKey
    }
  }

  // Check for duplicate key
  if (updates.key && updates.key !== currentField.key) {
    const otherKeys = state.fields
      .filter((_, i) => i !== index)
      .map((f) => f.key)
    if (otherKeys.includes(updates.key)) {
      return err(errors.duplicate('key', updates.key))
    }
  }

  const fields = [...state.fields]
  fields[index] = updatedField

  return ok({
    state: {
      ...state,
      fields,
      isDirty: true,
    },
    previousField: currentField,
  })
}

/**
 * Reorders a field from one index to another
 */
export function reorderField(
  state: SchemaBuilderState,
  fromIndex: number,
  toIndex: number
): Result<SchemaBuilderState, ValidationError> {
  if (fromIndex < 0 || fromIndex >= state.fields.length) {
    return err(errors.invalidIndex(fromIndex, state.fields.length))
  }
  if (toIndex < 0 || toIndex >= state.fields.length) {
    return err(errors.invalidIndex(toIndex, state.fields.length))
  }

  if (fromIndex === toIndex) {
    return ok(state)
  }

  const fields = [...state.fields]
  const [movedField] = fields.splice(fromIndex, 1)
  fields.splice(toIndex, 0, movedField)

  let selectedIndex = state.selectedIndex
  if (selectedIndex === fromIndex) {
    selectedIndex = toIndex
  } else if (selectedIndex !== null) {
    if (fromIndex < selectedIndex && toIndex >= selectedIndex) {
      selectedIndex--
    } else if (fromIndex > selectedIndex && toIndex <= selectedIndex) {
      selectedIndex++
    }
  }

  return ok({
    ...state,
    fields,
    selectedIndex,
    isDirty: true,
  })
}

/**
 * Duplicates a field at the given index
 */
export function duplicateField(
  state: SchemaBuilderState,
  index: number
): Result<{ state: SchemaBuilderState; field: FieldDefinition; insertIndex: number }, ValidationError> {
  if (index < 0 || index >= state.fields.length) {
    return err(errors.invalidIndex(index, state.fields.length))
  }

  const original = state.fields[index]
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
  const insertIndex = index + 1
  fields.splice(insertIndex, 0, duplicate)

  return ok({
    state: {
      ...state,
      fields,
      selectedIndex: insertIndex,
      isDirty: true,
    },
    field: duplicate,
    insertIndex,
  })
}

/**
 * Sets the schema name
 */
export function setName(
  state: SchemaBuilderState,
  name: string
): Result<SchemaBuilderState, ValidationError> {
  return ok({
    ...state,
    name,
    isDirty: true,
  })
}

/**
 * Selects a field at the given index
 */
export function selectField(
  state: SchemaBuilderState,
  index: number | null
): Result<SchemaBuilderState, ValidationError> {
  if (index !== null && (index < 0 || index >= state.fields.length)) {
    return err(errors.invalidIndex(index, state.fields.length))
  }

  return ok({
    ...state,
    selectedIndex: index,
  })
}

/**
 * Loads a schema into the builder
 */
export function loadSchema(
  name: string,
  fields: FieldDefinition[]
): SchemaBuilderState {
  return {
    name,
    fields,
    selectedIndex: fields.length > 0 ? 0 : null,
    isDirty: false,
  }
}

/**
 * Marks the state as clean (no unsaved changes)
 */
export function markClean(state: SchemaBuilderState): SchemaBuilderState {
  return {
    ...state,
    isDirty: false,
  }
}

/**
 * Resets to initial empty state
 */
export function reset(): SchemaBuilderState {
  return {
    name: '',
    fields: [],
    selectedIndex: null,
    isDirty: false,
  }
}
