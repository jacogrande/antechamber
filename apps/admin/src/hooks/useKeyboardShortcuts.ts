import { useEffect, useCallback } from 'react'

export interface KeyboardShortcutsConfig {
  onUndo?: () => void
  onRedo?: () => void
  onDelete?: () => void
  onDuplicate?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  enabled?: boolean
}

/**
 * Hook for handling keyboard shortcuts in the schema builder
 *
 * Shortcuts:
 * - Cmd/Ctrl + Z: Undo
 * - Cmd/Ctrl + Shift + Z: Redo
 * - Delete/Backspace: Delete selected field
 * - Cmd/Ctrl + D: Duplicate selected field
 * - Arrow Up: Move selection up
 * - Arrow Down: Move selection down
 */
export function useKeyboardShortcuts({
  onUndo,
  onRedo,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  enabled = true,
}: KeyboardShortcutsConfig) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Still allow Cmd+Z and Cmd+Shift+Z in inputs for text editing
        if (event.key !== 'z' || !event.metaKey) {
          return
        }
      }

      const isMeta = event.metaKey || event.ctrlKey

      // Cmd/Ctrl + Z (Undo) or Cmd/Ctrl + Shift + Z (Redo)
      if (event.key === 'z' && isMeta) {
        event.preventDefault()
        if (event.shiftKey) {
          onRedo?.()
        } else {
          onUndo?.()
        }
        return
      }

      // Cmd/Ctrl + D (Duplicate)
      if (event.key === 'd' && isMeta) {
        event.preventDefault()
        onDuplicate?.()
        return
      }

      // Delete or Backspace (Delete)
      if (event.key === 'Delete' || event.key === 'Backspace') {
        // Only trigger if not in an input field
        if (
          target.tagName !== 'INPUT' &&
          target.tagName !== 'TEXTAREA' &&
          !target.isContentEditable
        ) {
          event.preventDefault()
          onDelete?.()
          return
        }
      }

      // Arrow keys for navigation (when not in input)
      if (
        target.tagName !== 'INPUT' &&
        target.tagName !== 'TEXTAREA' &&
        !target.isContentEditable
      ) {
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          onMoveUp?.()
          return
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          onMoveDown?.()
          return
        }
      }
    },
    [enabled, onUndo, onRedo, onDelete, onDuplicate, onMoveUp, onMoveDown]
  )

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, handleKeyDown])
}
