import { useNavigate } from 'react-router-dom'
import { FileText, Plus } from 'lucide-react'
import { useSchemas } from '@/hooks/useSchemas'
import { Button } from '@/components/ui/button'
import { SchemaList } from '@/components/schemas/SchemaList'
import { EmptyState, LoadingSpinner, RetryableAlert } from '@/components/common'

export function Schemas() {
  const navigate = useNavigate()
  const { data: schemas, isLoading, error, refetch, isFetching } = useSchemas()

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
          <Button onClick={() => navigate('/schemas/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Schema
          </Button>
        )}
      </div>

      {hasSchemas ? (
        <SchemaList schemas={schemas} />
      ) : (
        <EmptyState
          icon={FileText}
          title="No schemas yet"
          description="Create your first schema to define the fields you want to extract from websites."
          actionLabel="Create Schema"
          onAction={() => navigate('/schemas/new')}
        />
      )}
    </div>
  )
}
