import { FormControl, FormLabel, FormHelperText } from '@chakra-ui/react'
import { TagInput } from '@/components/common'

interface EnumOptionsEditorProps {
  value: string[]
  onChange: (options: string[]) => void
  isDisabled?: boolean
}

export function EnumOptionsEditor({
  value,
  onChange,
  isDisabled,
}: EnumOptionsEditorProps) {
  return (
    <FormControl>
      <FormLabel fontSize="sm">Options</FormLabel>
      <TagInput
        value={value}
        onChange={onChange}
        placeholder="Add option..."
        maxTags={50}
        isDisabled={isDisabled}
      />
      <FormHelperText>
        Press Enter or comma to add. Backspace to remove.
      </FormHelperText>
    </FormControl>
  )
}
