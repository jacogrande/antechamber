import { useState } from 'react'
import { ChevronDown, ChevronRight, Trash2, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { useSchemaBuilderContext } from './SchemaBuilderProvider'
import { FieldTypeSelect } from './FieldTypeSelect'
import { EnumOptionsEditor } from './EnumOptionsEditor'
import { ValidationRulesEditor } from './ValidationRulesEditor'
import { TagInput } from '@/components/common'
import { cn } from '@/lib/utils'

export function SchemaInspector() {
  const { state, selectedField, updateField, deleteField, duplicateField } =
    useSchemaBuilderContext()
  const { selectedIndex } = state
  const [showAdvanced, setShowAdvanced] = useState(false)

  if (selectedIndex === null || !selectedField) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-2">
          <p className="text-sm">Select a field to edit</p>
          <p className="text-xs">or add a new field from the list</p>
        </div>
      </div>
    )
  }

  const update = (changes: Parameters<typeof updateField>[1]) => {
    updateField(selectedIndex, changes)
  }

  return (
    <div className="p-4 max-w-[480px]">
      <div className="flex flex-col gap-5">
        {/* Header with actions */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Properties
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => duplicateField(selectedIndex)}
              aria-label="Duplicate field"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => deleteField(selectedIndex)}
              aria-label="Delete field"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Core properties */}
        <InspectorField label="Label">
          <Input
            value={selectedField.label}
            onChange={(e) => update({ label: e.target.value })}
            placeholder="Field label"
          />
        </InspectorField>

        <InspectorField label="Key">
          <Input
            value={selectedField.key}
            onChange={(e) => update({ key: e.target.value })}
            placeholder="field_key"
            className="font-mono text-sm"
          />
        </InspectorField>

        <InspectorField label="Type">
          <FieldTypeSelect
            value={selectedField.type}
            onChange={(type) => {
              const changes: Parameters<typeof updateField>[1] = { type }
              if (type === 'enum' && !selectedField.enumOptions?.length) {
                changes.enumOptions = ['Option 1', 'Option 2']
              }
              if (type !== 'enum') {
                changes.enumOptions = undefined
              }
              update(changes)
            }}
          />
        </InspectorField>

        <InspectorField label="Required" horizontal>
          <Switch
            checked={selectedField.required}
            onCheckedChange={(checked) => update({ required: checked })}
          />
        </InspectorField>

        <InspectorField label="Instructions">
          <Textarea
            value={selectedField.instructions}
            onChange={(e) => update({ instructions: e.target.value })}
            placeholder="Instructions for the AI..."
            rows={3}
            className="text-sm"
          />
        </InspectorField>

        {/* Enum options */}
        {selectedField.type === 'enum' && (
          <div>
            <EnumOptionsEditor
              value={selectedField.enumOptions ?? []}
              onChange={(enumOptions) => update({ enumOptions })}
            />
          </div>
        )}

        <Separator />

        {/* Advanced section */}
        <div>
          <button
            type="button"
            className={cn(
              'w-full flex items-center justify-between py-1 cursor-pointer',
              'text-muted-foreground hover:text-foreground transition-colors'
            )}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <span className="text-xs font-semibold uppercase tracking-wider">
              Advanced
            </span>
            {showAdvanced ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          <div
            className={cn(
              'grid transition-all duration-200 ease-out',
              showAdvanced
                ? 'grid-rows-[1fr] opacity-100 pt-3'
                : 'grid-rows-[0fr] opacity-0'
            )}
          >
            <div className="overflow-hidden">
              <div className="flex flex-col gap-4">
                {/* Validation rules */}
                {(selectedField.type === 'string' ||
                  selectedField.type === 'string[]') && (
                  <ValidationRulesEditor
                    value={selectedField.validation}
                    onChange={(validation) => update({ validation })}
                  />
                )}

                {/* Confidence threshold */}
                <InspectorField
                  label={`Confidence: ${((selectedField.confidenceThreshold ?? 0.7) * 100).toFixed(0)}%`}
                >
                  <Slider
                    min={0}
                    max={1}
                    step={0.05}
                    value={[selectedField.confidenceThreshold ?? 0.7]}
                    onValueChange={([value]: number[]) =>
                      update({ confidenceThreshold: value })
                    }
                    className="mt-2"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-muted-foreground">
                      Lenient
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Strict
                    </span>
                  </div>
                </InspectorField>

                {/* Source hints */}
                <InspectorField label="Source Hints">
                  <TagInput
                    value={selectedField.sourceHints ?? []}
                    onChange={(sourceHints) =>
                      update({
                        sourceHints:
                          sourceHints.length > 0 ? sourceHints : undefined,
                      })
                    }
                    placeholder="URL patterns..."
                    maxTags={10}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    URLs where this data is likely found
                  </p>
                </InspectorField>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface InspectorFieldProps {
  label: string
  horizontal?: boolean
  children: React.ReactNode
}

function InspectorField({ label, horizontal, children }: InspectorFieldProps) {
  if (horizontal) {
    return (
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        {children}
      </div>
    )
  }

  return (
    <div>
      <span className="text-sm text-muted-foreground mb-1.5 block">{label}</span>
      {children}
    </div>
  )
}
