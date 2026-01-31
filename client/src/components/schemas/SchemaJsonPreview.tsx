import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { useSchemaBuilderContext } from './SchemaBuilderProvider'

export function SchemaJsonPreview() {
  const { state } = useSchemaBuilderContext()
  const json = JSON.stringify(state.fields, null, 2)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(json)
    toast.success('Copied to clipboard')
  }

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="json-preview" className="border-none">
        <div className="flex items-center gap-2">
          <AccordionTrigger className="flex-1 px-0 text-sm font-medium">
            JSON Preview
          </AccordionTrigger>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleCopy}
            aria-label="Copy JSON"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <AccordionContent className="px-0 pb-4">
          <pre className="p-4 bg-muted rounded-md text-xs font-mono overflow-x-auto max-h-[300px] overflow-y-auto">
            <code className="whitespace-pre">{json}</code>
          </pre>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
