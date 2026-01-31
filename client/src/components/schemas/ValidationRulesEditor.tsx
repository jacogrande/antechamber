import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="regex-pattern" className="text-sm">
          Regex Pattern
        </Label>
        <Input
          id="regex-pattern"
          placeholder="e.g., ^[A-Z]{2}[0-9]{4}$"
          className={cn('font-mono', regexError && 'border-destructive')}
          value={value?.regex ?? ''}
          onChange={(e) => handleRegexChange(e.target.value)}
        />
        {regexError && (
          <p className="text-sm text-destructive">{regexError}</p>
        )}
      </div>

      {showLengthValidation && (
        <div className="flex gap-4">
          <div className="flex flex-col gap-2 flex-1">
            <Label htmlFor="min-length" className="text-sm">
              Min Length
            </Label>
            <Input
              id="min-length"
              type="number"
              min={0}
              placeholder="0"
              value={value?.minLen ?? ''}
              onChange={(e) => handleMinLenChange(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2 flex-1">
            <Label htmlFor="max-length" className="text-sm">
              Max Length
            </Label>
            <Input
              id="max-length"
              type="number"
              min={0}
              placeholder="No limit"
              value={value?.maxLen ?? ''}
              onChange={(e) => handleMaxLenChange(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
