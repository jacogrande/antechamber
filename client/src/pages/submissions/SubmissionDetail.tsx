import { useState } from 'react'
import { toast } from 'sonner'
import { useParams, Link } from 'react-router-dom'
import { ChevronRight, ExternalLink, Check, AlertCircle, Pencil } from 'lucide-react'
import { useSubmission, useConfirmSubmission } from '@/hooks/useSubmissions'
import { LoadingSpinner, ConfirmDialog } from '@/components/common'
import { SubmissionStatusBadge } from '@/components/dashboard/SubmissionStatusBadge'
import { WorkflowProgress } from '@/components/submissions/WorkflowProgress'
import { ExtractedFieldsTable } from '@/components/submissions/ExtractedFieldsTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { FieldEdit } from '@/lib/api/submissions'

export function SubmissionDetail() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, error, refetch } = useSubmission(id)
  const confirmMutation = useConfirmSubmission()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [fieldEdits, setFieldEdits] = useState<Record<string, unknown>>({})

  const handleFieldEdit = (fieldKey: string, value: unknown) => {
    setFieldEdits((prev) => ({ ...prev, [fieldKey]: value }))
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setFieldEdits({})
  }

  const handleConfirm = async () => {
    if (!id) return

    // Convert edits to array format
    const edits: FieldEdit[] = Object.entries(fieldEdits).map(([fieldKey, value]) => ({
      fieldKey,
      value,
    }))

    try {
      await confirmMutation.mutateAsync({ id, params: edits.length > 0 ? { edits } : undefined })
      toast.success('Submission confirmed', {
        description: 'The submission has been confirmed and exported.',
      })
      setIsConfirmOpen(false)
      setIsEditing(false)
      setFieldEdits({})
    } catch (err) {
      toast.error('Failed to confirm submission', {
        description: err instanceof Error ? err.message : 'An error occurred',
      })
    }
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center gap-2">
          Failed to load submission.
          <Button variant="link" size="sm" onClick={() => refetch()} className="h-auto p-0">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  const { submission } = data

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <Link to="/" className="hover:text-foreground">
          Dashboard
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">Submission</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold">Submission</h1>
            <SubmissionStatusBadge status={submission.status} />
          </div>
          <p className="text-muted-foreground">
            <a
              href={submission.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              {submission.websiteUrl}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Created {new Date(submission.createdAt).toLocaleString()}
            {submission.schemaName && ` • Schema: ${submission.schemaName}`}
          </p>
        </div>
        {submission.status === 'draft' && (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
                <Button onClick={() => setIsConfirmOpen(true)} disabled={confirmMutation.isPending}>
                  <Check className="h-4 w-4 mr-2" />
                  {Object.keys(fieldEdits).length > 0
                    ? `Save & Confirm (${Object.keys(fieldEdits).length} edits)`
                    : 'Confirm Submission'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Fields
                </Button>
                <Button onClick={() => setIsConfirmOpen(true)} disabled={confirmMutation.isPending}>
                  <Check className="h-4 w-4 mr-2" />
                  Confirm Submission
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Workflow Progress */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Workflow Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkflowProgress steps={submission.workflowSteps ?? []} />
        </CardContent>
      </Card>

      {/* Extracted Fields */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Extracted Fields</CardTitle>
            <span className="text-sm text-muted-foreground">
              {(submission.extractedFields ?? []).filter((f) => f.status === 'found').length} /{' '}
              {(submission.extractedFields ?? []).length} found
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <ExtractedFieldsTable
            fields={submission.extractedFields ?? []}
            isEditing={isEditing}
            fieldEdits={fieldEdits}
            onFieldEdit={handleFieldEdit}
          />
        </CardContent>
      </Card>

      {/* Crawled Pages */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Crawled Pages</CardTitle>
        </CardHeader>
        <CardContent>
          {!submission.artifacts?.length ? (
            <p className="text-sm text-muted-foreground">No pages crawled yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead>Page Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Fetched</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submission.artifacts.map((artifact, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <a
                          href={artifact.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1 max-w-[400px] truncate"
                        >
                          {artifact.url}
                          <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                        </a>
                      </TableCell>
                      <TableCell className="capitalize">
                        {artifact.pageType.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            artifact.statusCode >= 200 && artifact.statusCode < 300
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }
                        >
                          {artifact.statusCode}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(artifact.fetchedAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Details */}
      {submission.status === 'confirmed' && submission.confirmedAt && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Confirmation Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p>
                <span className="font-medium">Confirmed at:</span>{' '}
                {new Date(submission.confirmedAt).toLocaleString()}
              </p>
              {submission.confirmedBy && (
                <p>
                  <span className="font-medium">Confirmed by:</span> {submission.confirmedBy}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirm}
        title="Confirm Submission"
        message="Are you sure you want to confirm this submission? This will trigger webhook delivery and mark the submission as final."
        confirmLabel="Confirm"
        isLoading={confirmMutation.isPending}
      />
    </div>
  )
}
