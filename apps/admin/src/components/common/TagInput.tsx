import { useState, useCallback, type KeyboardEvent } from 'react'
import {
  Box,
  Input,
  Tag,
  TagLabel,
  TagCloseButton,
  Wrap,
  WrapItem,
} from '@chakra-ui/react'

interface TagInputProps {
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  maxTags?: number
  isDisabled?: boolean
}

export function TagInput({
  value,
  onChange,
  placeholder = 'Add item...',
  maxTags,
  isDisabled = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim()
      if (!trimmed) return
      if (value.includes(trimmed)) return
      if (maxTags && value.length >= maxTags) return

      onChange([...value, trimmed])
      setInputValue('')
    },
    [value, onChange, maxTags]
  )

  const removeTag = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index))
    },
    [value, onChange]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault()
        addTag(inputValue)
      } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
        removeTag(value.length - 1)
      }
    },
    [inputValue, value, addTag, removeTag]
  )

  const handleBlur = useCallback(() => {
    if (inputValue.trim()) {
      addTag(inputValue)
    }
  }, [inputValue, addTag])

  return (
    <Box
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="md"
      p={2}
      bg="bg.surface"
      _focusWithin={{
        borderColor: 'brand.500',
        boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
      }}
    >
      <Wrap spacing={2}>
        {value.map((tag, index) => (
          <WrapItem key={`${tag}-${index}`}>
            <Tag size="md" variant="subtle" colorScheme="blue">
              <TagLabel>{tag}</TagLabel>
              {!isDisabled && (
                <TagCloseButton onClick={() => removeTag(index)} />
              )}
            </Tag>
          </WrapItem>
        ))}
        <WrapItem flex={1} minW="120px">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={value.length === 0 ? placeholder : ''}
            variant="unstyled"
            size="sm"
            isDisabled={isDisabled || (maxTags !== undefined && value.length >= maxTags)}
          />
        </WrapItem>
      </Wrap>
    </Box>
  )
}
