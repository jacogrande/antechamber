import { TagInput } from '@/components/common'
import { Label } from '@/components/ui/label'

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
    <div className="flex flex-col gap-2">
      <Label className="text-sm">Options</Label>
      <TagInput
        value={value}
        onChange={onChange}
        placeholder="Add option..."
        maxTags={50}
        isDisabled={isDisabled}
      />
      <p className="text-xs text-muted-foreground">
        Press Enter or comma to add. Backspace to remove.
      </p>
    </div>
  )
}
