import {
  VStack,
  FormControl,
  FormLabel,
  Input,
  HStack,
  NumberInput,
  NumberInputField,
  FormErrorMessage,
} from '@chakra-ui/react'
import { useState } from 'react'

interface ValidationRules {
  regex?: string
  minLen?: number
  maxLen?: number
}

interface ValidationRulesEditorProps {
  value: ValidationRules | undefined
  onChange: (validation: ValidationRules | undefined) => void
  showLengthValidation?: boolean
}

export function ValidationRulesEditor({
  value,
  onChange,
  showLengthValidation = true,
}: ValidationRulesEditorProps) {
  const [regexError, setRegexError] = useState<string | null>(null)

  const handleRegexChange = (regex: string) => {
    if (regex) {
      try {
        new RegExp(regex)
        setRegexError(null)
      } catch {
        setRegexError('Invalid regular expression')
      }
    } else {
      setRegexError(null)
    }

    const newValue = { ...value, regex: regex || undefined }
    if (!newValue.regex && !newValue.minLen && !newValue.maxLen) {
      onChange(undefined)
    } else {
      onChange(newValue)
    }
  }

  const handleMinLenChange = (minLen: string) => {
    const num = minLen ? parseInt(minLen, 10) : undefined
    const newValue = { ...value, minLen: num }
    if (!newValue.regex && !newValue.minLen && !newValue.maxLen) {
      onChange(undefined)
    } else {
      onChange(newValue)
    }
  }

  const handleMaxLenChange = (maxLen: string) => {
    const num = maxLen ? parseInt(maxLen, 10) : undefined
    const newValue = { ...value, maxLen: num }
    if (!newValue.regex && !newValue.minLen && !newValue.maxLen) {
      onChange(undefined)
    } else {
      onChange(newValue)
    }
  }

  return (
    <VStack spacing={4} align="stretch">
      <FormControl isInvalid={!!regexError}>
        <FormLabel fontSize="sm">Regex Pattern</FormLabel>
        <Input
          size="sm"
          placeholder="e.g., ^[A-Z]{2}[0-9]{4}$"
          fontFamily="mono"
          value={value?.regex ?? ''}
          onChange={(e) => handleRegexChange(e.target.value)}
        />
        {regexError && <FormErrorMessage>{regexError}</FormErrorMessage>}
      </FormControl>

      {showLengthValidation && (
        <HStack spacing={4}>
          <FormControl>
            <FormLabel fontSize="sm">Min Length</FormLabel>
            <NumberInput
              size="sm"
              min={0}
              value={value?.minLen ?? ''}
              onChange={handleMinLenChange}
            >
              <NumberInputField placeholder="0" />
            </NumberInput>
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Max Length</FormLabel>
            <NumberInput
              size="sm"
              min={0}
              value={value?.maxLen ?? ''}
              onChange={handleMaxLenChange}
            >
              <NumberInputField placeholder="No limit" />
            </NumberInput>
          </FormControl>
        </HStack>
      )}
    </VStack>
  )
}
