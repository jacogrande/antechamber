import type { UndoAction, UndoHistory } from '@/domain/undo/models/undo-action'
import type { Result } from '@/lib/utils/result'
import { ok, err } from '@/lib/utils/result'

/**
 * Pure functions for managing undo history (Functional Core)
 */

/**
 * Creates a new empty undo history
 */
export function createHistory(maxSize: number = 50): UndoHistory {
  return {
    past: [],
    future: [],
    maxSize,
  }
}

/**
 * Pushes an action onto the history stack
 * Clears the future stack (no redo after new action)
 */
export function pushAction(history: UndoHistory, action: UndoAction): UndoHistory {
  const newPast = [...history.past, action]

  // Keep only the last maxSize actions
  const trimmedPast = newPast.slice(-history.maxSize)

  return {
    ...history,
    past: trimmedPast,
    future: [], // Clear redo stack on new action
  }
}

/**
 * Pops the most recent action from history for undo
 * Returns the action and the new history with the action moved to future
 */
export function undo(
  history: UndoHistory
): Result<{ action: UndoAction; history: UndoHistory }, string> {
  if (history.past.length === 0) {
    return err('Nothing to undo')
  }

  const past = [...history.past]
  const action = past.pop()!

  return ok({
    action,
    history: {
      ...history,
      past,
      future: [action, ...history.future],
    },
  })
}

/**
 * Pops an action from the future stack for redo
 * Returns the action and the new history with the action moved to past
 */
export function redo(
  history: UndoHistory
): Result<{ action: UndoAction; history: UndoHistory }, string> {
  if (history.future.length === 0) {
    return err('Nothing to redo')
  }

  const future = [...history.future]
  const action = future.shift()!

  return ok({
    action,
    history: {
      ...history,
      past: [...history.past, action],
      future,
    },
  })
}

/**
 * Checks if there are any actions to undo
 */
export function canUndo(history: UndoHistory): boolean {
  return history.past.length > 0
}

/**
 * Checks if there are any actions to redo
 */
export function canRedo(history: UndoHistory): boolean {
  return history.future.length > 0
}

/**
 * Clears all actions from history
 */
export function clearHistory(history: UndoHistory): UndoHistory {
  return {
    ...history,
    past: [],
    future: [],
  }
}

/**
 * Gets the inverse action for applying undo/redo
 */
export function getInverseAction(action: UndoAction): UndoAction {
  switch (action.type) {
    case 'add':
      return {
        type: 'delete',
        field: action.field,
        index: action.insertIndex,
        inverse: { type: 'add' },
      }
    case 'delete':
      return {
        type: 'add',
        field: action.field,
        insertIndex: action.index,
        inverse: { type: 'delete' },
      }
    case 'update':
      return {
        type: 'update',
        index: action.index,
        previousField: action.newField,
        newField: action.previousField,
        inverse: { type: 'update' },
      }
    case 'reorder':
      return {
        type: 'reorder',
        fromIndex: action.toIndex,
        toIndex: action.fromIndex,
        inverse: { type: 'reorder' },
      }
    case 'duplicate':
      return {
        type: 'delete',
        field: action.field,
        index: action.insertIndex,
        inverse: { type: 'add' },
      }
    case 'setName':
      return {
        type: 'setName',
        previousName: action.newName,
        newName: action.previousName,
        inverse: { type: 'setName' },
      }
  }
}
