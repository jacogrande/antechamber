import { useState, useCallback, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

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
    <div
      className={cn(
        'flex flex-wrap gap-2 rounded-md border border-input bg-background p-2',
        'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2'
      )}
    >
      {value.map((tag, index) => (
        <Badge key={`${tag}-${index}`} variant="secondary" className="gap-1">
          {tag}
          {!isDisabled && (
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="ml-1 rounded-full hover:bg-muted-foreground/20"
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Remove {tag}</span>
            </button>
          )}
        </Badge>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={value.length === 0 ? placeholder : ''}
        disabled={isDisabled || (maxTags !== undefined && value.length >= maxTags)}
        className={cn(
          'flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
      />
    </div>
  )
}
