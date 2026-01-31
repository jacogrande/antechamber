import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { FieldTypeSelect } from './FieldTypeSelect'
import { EnumOptionsEditor } from './EnumOptionsEditor'
import { ValidationRulesEditor } from './ValidationRulesEditor'
import { TagInput } from '@/components/common'
import { useSchemaBuilderContext } from './SchemaBuilderProvider'
import {
  FieldSet,
  FieldGroup,
  Field,
  FieldLabel,
  FieldDescription,
} from '@/components/ui/Field'

export function FieldPropertiesPanel() {
  const { state, selectedField, updateField } = useSchemaBuilderContext()
  const { selectedIndex } = state

  if (selectedIndex === null || !selectedField) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>Select a field to edit its properties</p>
      </div>
    )
  }

  const update = (changes: Parameters<typeof updateField>[1]) => {
    updateField(selectedIndex, changes)
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <FieldSet legend="Field Properties">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="field-label" isRequired>
              Label
            </FieldLabel>
            <Input
              id="field-label"
              value={selectedField.label}
              onChange={(e) => update({ label: e.target.value })}
              placeholder="Field label"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="field-key" isRequired>
              Key
            </FieldLabel>
            <Input
              id="field-key"
              value={selectedField.key}
              onChange={(e) => update({ key: e.target.value })}
              placeholder="field_key"
              className="font-mono"
            />
            <FieldDescription>
              Unique identifier used in the output JSON
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="field-type" isRequired>
              Type
            </FieldLabel>
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
          </Field>

          <Field>
            <FieldLabel htmlFor="field-instructions">
              Instructions
            </FieldLabel>
            <Textarea
              id="field-instructions"
              value={selectedField.instructions}
              onChange={(e) => update({ instructions: e.target.value })}
              placeholder="Instructions for the AI to extract this field..."
              rows={3}
            />
            <FieldDescription>
              Guide the AI on how to extract this field from source pages
            </FieldDescription>
          </Field>

          <Field orientation="horizontal">
            <FieldLabel htmlFor="field-required">
              Required
            </FieldLabel>
            <Switch
              id="field-required"
              checked={selectedField.required}
              onCheckedChange={(checked) => update({ required: checked })}
              aria-describedby="required-description"
            />
          </Field>

          {selectedField.type === 'enum' && (
            <Field>
              <EnumOptionsEditor
                value={selectedField.enumOptions ?? []}
                onChange={(enumOptions) => update({ enumOptions })}
              />
            </Field>
          )}
        </FieldGroup>
      </FieldSet>

      <Accordion type="multiple" className="mt-6">
        <AccordionItem value="advanced" className="border-none">
          <AccordionTrigger className="px-0 text-sm font-medium">
            Advanced Settings
          </AccordionTrigger>
          <AccordionContent className="px-0 pb-4">
            <FieldGroup>
              {(selectedField.type === 'string' || selectedField.type === 'string[]') && (
                <Field>
                  <ValidationRulesEditor
                    value={selectedField.validation}
                    onChange={(validation) => update({ validation })}
                  />
                </Field>
              )}

              <Field>
                <FieldLabel htmlFor="confidence-threshold">
                  Confidence Threshold: {(selectedField.confidenceThreshold ?? 0.7).toFixed(2)}
                </FieldLabel>
                <input
                  id="confidence-threshold"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={selectedField.confidenceThreshold ?? 0.7}
                  onChange={(e) => update({ confidenceThreshold: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  aria-label="Confidence threshold"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0 (lenient)</span>
                  <span>1 (strict)</span>
                </div>
              </Field>

              <Field>
                <FieldLabel htmlFor="source-hints">Source Hints</FieldLabel>
                <TagInput
                  value={selectedField.sourceHints ?? []}
                  onChange={(sourceHints) =>
                    update({ sourceHints: sourceHints.length > 0 ? sourceHints : undefined })
                  }
                  placeholder="URL patterns..."
                  maxTags={20}
                />
                <FieldDescription>
                  URL patterns where this data might be found
                </FieldDescription>
              </Field>
            </FieldGroup>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
