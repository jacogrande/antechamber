import { useState } from 'react'
import { toast } from 'sonner'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Plus, ChevronRight, Trash2 } from 'lucide-react'
import { useSchema, useDeleteSchema } from '@/hooks/useSchemas'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner, RetryableAlert, ConfirmDialog } from '@/components/common'
import { SchemaVersionTimeline } from '@/components/schemas/SchemaVersionTimeline'
import { FieldsTable } from '@/components/schemas/FieldsTable'

export function SchemaDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading, error, refetch, isFetching } = useSchema(id)
  const deleteMutation = useDeleteSchema()
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const handleDelete = async () => {
    if (!id) return

    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Schema deleted', {
        description: 'The schema has been permanently deleted.',
      })
      navigate('/schemas')
    } catch (err) {
      toast.error('Failed to delete schema', {
        description: err instanceof Error ? err.message : 'An error occurred',
      })
      setIsDeleteOpen(false)
    }
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error || !data) {
    return (
      <RetryableAlert
        message="Failed to load schema. Please try again."
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />
    )
  }

  const { schema, latestVersion, versions } = data

  return (
    <div>
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <Link to="/schemas" className="hover:text-foreground">
          Schemas
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{schema.name}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{schema.name}</h1>
          {latestVersion && (
            <p className="text-muted-foreground mt-1">
              Version {latestVersion.version} - {latestVersion.fields.length} fields
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => setIsDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
          <Button onClick={() => navigate(`/schemas/${id}/versions/new`)}>
            <Plus className="h-4 w-4 mr-2" />
            New Version
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fields Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fields</CardTitle>
          </CardHeader>
          <CardContent>
            {latestVersion ? (
              <FieldsTable fields={latestVersion.fields} />
            ) : (
              <p className="text-muted-foreground">No fields defined yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Version History Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Version History</CardTitle>
          </CardHeader>
          <CardContent>
            {versions.length > 0 ? (
              <SchemaVersionTimeline
                schemaId={schema.id}
                versions={versions}
                currentVersion={latestVersion?.version ?? 0}
              />
            ) : (
              <p className="text-muted-foreground">No versions yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Schema"
        message={`Are you sure you want to delete "${schema.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
        isDestructive
      />
    </div>
  )
}
