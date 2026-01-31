import type { FieldDefinition } from '@/types/schema'

/**
 * Represents an undoable action with its inverse operation
 */
export type UndoAction =
  | {
      type: 'add'
      field: FieldDefinition
      insertIndex: number
      inverse: { type: 'delete' }
    }
  | {
      type: 'delete'
      field: FieldDefinition
      index: number
      inverse: { type: 'add' }
    }
  | {
      type: 'update'
      index: number
      previousField: FieldDefinition
      newField: FieldDefinition
      inverse: { type: 'update' }
    }
  | {
      type: 'reorder'
      fromIndex: number
      toIndex: number
      inverse: { type: 'reorder' }
    }
  | {
      type: 'duplicate'
      insertIndex: number
      field: FieldDefinition
      inverse: { type: 'delete' }
    }
  | {
      type: 'setName'
      previousName: string
      newName: string
      inverse: { type: 'setName' }
    }

/**
 * History of undo actions with redo support
 */
export interface UndoHistory {
  readonly past: readonly UndoAction[]
  readonly future: readonly UndoAction[]
  readonly maxSize: number
}
