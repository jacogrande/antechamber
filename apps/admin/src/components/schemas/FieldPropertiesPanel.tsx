import {
  Box,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Switch,
  Text,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  HStack,
} from '@chakra-ui/react'
import { FieldTypeSelect } from './FieldTypeSelect'
import { EnumOptionsEditor } from './EnumOptionsEditor'
import { ValidationRulesEditor } from './ValidationRulesEditor'
import { TagInput } from '@/components/common'
import { useSchemaBuilderContext } from './SchemaBuilderProvider'

export function FieldPropertiesPanel() {
  const { state, selectedField, updateField } = useSchemaBuilderContext()
  const { selectedIndex } = state

  if (selectedIndex === null || !selectedField) {
    return (
      <Box p={4} color="text.muted" textAlign="center">
        <Text>Select a field to edit its properties</Text>
      </Box>
    )
  }

  const update = (changes: Parameters<typeof updateField>[1]) => {
    updateField(selectedIndex, changes)
  }

  return (
    <Box p={4} overflowY="auto" h="full">
      <VStack spacing={4} align="stretch">
        <FormControl>
          <FormLabel fontSize="sm">Label</FormLabel>
          <Input
            size="sm"
            value={selectedField.label}
            onChange={(e) => update({ label: e.target.value })}
            placeholder="Field label"
          />
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm">Key</FormLabel>
          <Input
            size="sm"
            value={selectedField.key}
            onChange={(e) => update({ key: e.target.value })}
            placeholder="field_key"
            fontFamily="mono"
          />
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm">Type</FormLabel>
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
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm">Instructions</FormLabel>
          <Textarea
            size="sm"
            value={selectedField.instructions}
            onChange={(e) => update({ instructions: e.target.value })}
            placeholder="Instructions for the AI to extract this field..."
            rows={3}
          />
        </FormControl>

        <FormControl display="flex" alignItems="center">
          <FormLabel fontSize="sm" mb={0}>
            Required
          </FormLabel>
          <Switch
            isChecked={selectedField.required}
            onChange={(e) => update({ required: e.target.checked })}
          />
        </FormControl>

        {selectedField.type === 'enum' && (
          <EnumOptionsEditor
            value={selectedField.enumOptions ?? []}
            onChange={(enumOptions) => update({ enumOptions })}
          />
        )}

        <Accordion allowMultiple>
          <AccordionItem border="none">
            <AccordionButton px={0}>
              <Box flex={1} textAlign="left" fontSize="sm" fontWeight="medium">
                Advanced Settings
              </Box>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel px={0} pb={4}>
              <VStack spacing={4} align="stretch">
                {(selectedField.type === 'string' || selectedField.type === 'string[]') && (
                  <ValidationRulesEditor
                    value={selectedField.validation}
                    onChange={(validation) => update({ validation })}
                  />
                )}

                <FormControl>
                  <FormLabel fontSize="sm">
                    Confidence Threshold: {(selectedField.confidenceThreshold ?? 0.7).toFixed(2)}
                  </FormLabel>
                  <Slider
                    min={0}
                    max={1}
                    step={0.05}
                    value={selectedField.confidenceThreshold ?? 0.7}
                    onChange={(value) => update({ confidenceThreshold: value })}
                  >
                    <SliderTrack>
                      <SliderFilledTrack />
                    </SliderTrack>
                    <SliderThumb />
                  </Slider>
                  <HStack justify="space-between" fontSize="xs" color="text.muted">
                    <Text>0 (lenient)</Text>
                    <Text>1 (strict)</Text>
                  </HStack>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm">Source Hints</FormLabel>
                  <TagInput
                    value={selectedField.sourceHints ?? []}
                    onChange={(sourceHints) =>
                      update({ sourceHints: sourceHints.length > 0 ? sourceHints : undefined })
                    }
                    placeholder="URL patterns..."
                    maxTags={20}
                  />
                  <Text fontSize="xs" color="text.muted" mt={1}>
                    URL patterns where this data might be found
                  </Text>
                </FormControl>
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </VStack>
    </Box>
  )
}
