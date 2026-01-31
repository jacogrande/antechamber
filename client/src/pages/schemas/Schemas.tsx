import { useNavigate } from 'react-router-dom'
import { FileText, Plus, Sparkles } from 'lucide-react'
import { useSchemas } from '@/hooks/useSchemas'
import { useDisclosure } from '@/hooks/useDisclosure'
import { Button } from '@/components/ui/button'
import { SchemaList } from '@/components/schemas/SchemaList'
import { SchemaTemplateGallery } from '@/components/schemas/SchemaTemplateGallery'
import { EmptyState, LoadingSpinner, RetryableAlert } from '@/components/common'
import type { ExampleSchema } from '@/lib/example-schemas'

export function Schemas() {
  const navigate = useNavigate()
  const { data: schemas, isLoading, error, refetch, isFetching } = useSchemas()
  const templateGallery = useDisclosure()

  const handleTemplateImport = (schema: ExampleSchema) => {
    // Navigate to create page with template data in state
    navigate('/schemas/new', {
      state: {
        template: {
          name: schema.name,
          fields: schema.fields,
        },
      },
    })
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error) {
    return (
      <RetryableAlert
        message="Failed to load schemas. Please try again."
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />
    )
  }

  const hasSchemas = schemas && schemas.length > 0

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Schemas</h1>
        {hasSchemas && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={templateGallery.onOpen}>
              <Sparkles className="h-4 w-4 mr-2" />
              Browse Templates
            </Button>
            <Button onClick={() => navigate('/schemas/new')}>
              <Plus className="h-4 w-4 mr-2" />
              New Schema
            </Button>
          </div>
        )}
      </div>

      {hasSchemas ? (
        <SchemaList schemas={schemas} />
      ) : (
        <div className="space-y-6">
          <EmptyState
            icon={FileText}
            title="No schemas yet"
            description="Create your first schema to define the fields you want to extract from websites."
            actionLabel="Create Schema"
            onAction={() => navigate('/schemas/new')}
          />

          {/* Template suggestion for empty state */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Or start with a template
            </p>
            <Button variant="outline" onClick={templateGallery.onOpen}>
              <Sparkles className="h-4 w-4 mr-2" />
              Browse Templates
            </Button>
          </div>
        </div>
      )}

      <SchemaTemplateGallery
        isOpen={templateGallery.isOpen}
        onClose={templateGallery.onClose}
        onImport={handleTemplateImport}
      />
    </div>
  )
}
