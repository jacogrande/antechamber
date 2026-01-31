import { useState, useEffect, useCallback } from 'react'
import { useBlocker } from 'react-router-dom'
import { Undo2, Redo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { SchemaFieldList } from './SchemaFieldList'
import { SchemaInspector } from './SchemaInspector'
import { ConfirmDialog } from '@/components/common'
import { useSchemaBuilderContext } from './SchemaBuilderProvider'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

interface SchemaBuilderProps {
  onSave: () => void
  onCancel: () => void
  isSaving?: boolean
  saveLabel?: string
}

export function SchemaBuilder({
  onSave,
  onCancel,
  isSaving,
  saveLabel = 'Save',
}: SchemaBuilderProps) {
  const {
    state,
    setName,
    canUndo,
    canRedo,
    undo,
    redo,
    deleteField,
    duplicateField,
    selectField,
  } = useSchemaBuilderContext()

  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const canSave = state.name.trim() && state.fields.length > 0

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onUndo: undo,
    onRedo: redo,
    onDelete: state.selectedIndex !== null ? () => deleteField(state.selectedIndex!) : undefined,
    onDuplicate: state.selectedIndex !== null ? () => duplicateField(state.selectedIndex!) : undefined,
    onMoveUp:
      state.selectedIndex !== null && state.selectedIndex > 0
        ? () => selectField(state.selectedIndex! - 1)
        : undefined,
    onMoveDown:
      state.selectedIndex !== null && state.selectedIndex < state.fields.length - 1
        ? () => selectField(state.selectedIndex! + 1)
        : undefined,
    enabled: true,
  })

  // Block navigation when there are unsaved changes
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      state.isDirty && currentLocation.pathname !== nextLocation.pathname
  )

  // Show browser warning when closing/refreshing with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [state.isDirty])

  const handleCancel = useCallback(() => {
    if (state.isDirty) {
      setIsConfirmOpen(true)
    } else {
      onCancel()
    }
  }, [state.isDirty, onCancel])

  const handleConfirmDiscard = useCallback(() => {
    setIsConfirmOpen(false)
    onCancel()
  }, [onCancel])

  // Handle navigation blocker
  useEffect(() => {
    if (blocker.state === 'blocked') {
      setIsConfirmOpen(true)
    }
  }, [blocker.state])

  const handleConfirmNavigation = useCallback(() => {
    setIsConfirmOpen(false)
    if (blocker.state === 'blocked') {
      blocker.proceed()
    }
  }, [blocker])

  const handleCancelNavigation = useCallback(() => {
    setIsConfirmOpen(false)
    if (blocker.state === 'blocked') {
      blocker.reset()
    }
  }, [blocker])

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Minimal header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Input
            value={state.name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Untitled Schema"
            className="border-none shadow-none font-semibold text-base w-auto min-w-[200px] focus-visible:ring-0 bg-transparent"
          />
          {state.isDirty && (
            <span className="text-xs text-muted-foreground">Edited</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!canUndo}
                  onClick={undo}
                  aria-label="Undo"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo (Cmd+Z)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!canRedo}
                  onClick={redo}
                  aria-label="Redo"
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo (Cmd+Shift+Z)</TooltipContent>
            </Tooltip>
          </div>

          <Button variant="ghost" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={!canSave || isSaving}
            isLoading={isSaving}
          >
            {saveLabel}
          </Button>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Field list */}
        <div className="w-[280px] border-r border-border overflow-y-auto bg-muted/30">
          <SchemaFieldList />
        </div>

        {/* Right: Inspector */}
        <div className="flex-1 overflow-y-auto bg-card">
          <SchemaInspector />
        </div>
      </div>

      {/* Unsaved changes confirmation */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={blocker.state === 'blocked' ? handleCancelNavigation : () => setIsConfirmOpen(false)}
        onConfirm={blocker.state === 'blocked' ? handleConfirmNavigation : handleConfirmDiscard}
        title="Discard changes?"
        message="You have unsaved changes. Are you sure you want to leave? Your changes will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        isDestructive
      />
    </div>
  )
}
