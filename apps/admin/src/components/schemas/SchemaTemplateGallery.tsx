import { useState, useMemo } from 'react'
import { Search, FileText, ArrowRight, Sparkles } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  exampleSchemas,
  getSchemasByCategory,
  categoryLabels,
  categoryDescriptions,
  type ExampleSchema,
  type SchemaCategory,
} from '@/lib/example-schemas'

interface SchemaTemplateGalleryProps {
  isOpen: boolean
  onClose: () => void
  onImport: (schema: ExampleSchema) => void
}

const categories: SchemaCategory[] = [
  'ai',
  'sales',
  'hr',
  'finance',
  'customer',
  'nonprofit',
]

function SchemaCard({
  schema,
  onSelect,
}: {
  schema: ExampleSchema
  onSelect: (schema: ExampleSchema) => void
}) {
  return (
    <button
      onClick={() => onSelect(schema)}
      className={cn(
        'w-full text-left p-4 rounded-lg border border-border bg-card',
        'transition-all duration-200',
        'hover:border-primary/50 hover:shadow-sm',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate">{schema.name}</h3>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {schema.description}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="secondary" className="text-xs">
              {schema.fields.length} fields
            </Badge>
            {schema.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
      </div>
    </button>
  )
}

function SchemaPreview({
  schema,
  onImport,
  onBack,
}: {
  schema: ExampleSchema
  onImport: () => void
  onBack: () => void
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">{schema.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">{schema.description}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {schema.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-medium mb-3">
            Fields ({schema.fields.length})
          </h4>
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {schema.fields.map((field) => (
                <div
                  key={field.key}
                  className="p-3 rounded-md bg-muted/50 border border-border/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{field.label}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {field.type}
                      </Badge>
                      {field.required && (
                        <Badge variant="destructive" className="text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                  </div>
                  <code className="text-xs text-muted-foreground font-mono block mt-1">
                    {field.key}
                  </code>
                  {field.instructions && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {field.instructions}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
        <Button variant="outline" onClick={onBack}>
          Cancel
        </Button>
        <Button onClick={onImport}>
          <Sparkles className="h-4 w-4 mr-2" />
          Use Template
        </Button>
      </div>
    </div>
  )
}

export function SchemaTemplateGallery({
  isOpen,
  onClose,
  onImport,
}: SchemaTemplateGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<SchemaCategory | 'all'>('all')
  const [previewSchema, setPreviewSchema] = useState<ExampleSchema | null>(null)

  const filteredSchemas = useMemo(() => {
    let schemas =
      selectedCategory === 'all'
        ? exampleSchemas
        : getSchemasByCategory(selectedCategory)

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      schemas = schemas.filter(
        (schema) =>
          schema.name.toLowerCase().includes(query) ||
          schema.description.toLowerCase().includes(query) ||
          schema.tags.some((tag) => tag.includes(query))
      )
    }

    return schemas
  }, [selectedCategory, searchQuery])

  const handleImport = (schema: ExampleSchema) => {
    onImport(schema)
    onClose()
    setPreviewSchema(null)
    setSearchQuery('')
    setSelectedCategory('all')
  }

  const handleClose = () => {
    onClose()
    setPreviewSchema(null)
    setSearchQuery('')
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Schema Templates
          </DialogTitle>
          <DialogDescription>
            Start with a pre-built template and customize it for your needs
          </DialogDescription>
        </DialogHeader>

        {previewSchema ? (
          <div className="flex-1 overflow-hidden p-6">
            <SchemaPreview
              schema={previewSchema}
              onImport={() => handleImport(previewSchema)}
              onBack={() => setPreviewSchema(null)}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Search */}
            <div className="px-6 py-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Category tabs */}
            <Tabs
              value={selectedCategory}
              onValueChange={(v) => setSelectedCategory(v as SchemaCategory | 'all')}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="px-6">
                <TabsList className="w-full justify-start h-auto p-1 flex-wrap gap-1">
                  <TabsTrigger value="all" className="text-xs">
                    All
                  </TabsTrigger>
                  {categories.map((category) => (
                    <TabsTrigger key={category} value={category} className="text-xs">
                      {categoryLabels[category]}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <TabsContent value={selectedCategory} className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full">
                  <div className="px-6 py-4">
                    {selectedCategory !== 'all' && (
                      <p className="text-sm text-muted-foreground mb-4">
                        {categoryDescriptions[selectedCategory as SchemaCategory]}
                      </p>
                    )}

                    {filteredSchemas.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>No templates found</p>
                        <p className="text-sm mt-1">Try a different search term</p>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {filteredSchemas.map((schema) => (
                          <SchemaCard
                            key={schema.id}
                            schema={schema}
                            onSelect={setPreviewSchema}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
