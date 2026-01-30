import { useState } from 'react'
import { toast } from 'sonner'
import { X, AlertCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useSchemas } from '@/hooks/useSchemas'
import { useCreateSubmission } from '@/hooks/useSubmissions'
import type { Schema } from '@/types/schema'

const createSubmissionSchema = z.object({
  schemaId: z.string().uuid('Please select a schema'),
  websiteUrl: z.string().url('Please enter a valid URL'),
})

type CreateSubmissionForm = z.infer<typeof createSubmissionSchema>

interface CreateSubmissionModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateSubmissionModal({ isOpen, onClose }: CreateSubmissionModalProps) {
  const { data: schemasData, isLoading: schemasLoading } = useSchemas()
  const createMutation = useCreateSubmission()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateSubmissionForm>({
    resolver: zodResolver(createSubmissionSchema),
    defaultValues: {
      schemaId: '',
      websiteUrl: '',
    },
  })

  const schemaId = watch('schemaId')

  const onSubmit = async (data: CreateSubmissionForm) => {
    setError(null)
    try {
      await createMutation.mutateAsync(data)
      toast.success('Submission created', {
        description: 'The website will be crawled and data extracted.',
      })
      reset()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create submission')
    }
  }

  const handleClose = () => {
    reset()
    setError(null)
    onClose()
  }

  const schemas: Schema[] = schemasData ?? []

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Submission</DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
          <div className="flex flex-col gap-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex-1 flex items-center justify-between">
                  <span>{error}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => setError(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="schema">Schema</Label>
              <Select
                value={schemaId}
                onValueChange={(value) => setValue('schemaId', value)}
                disabled={schemasLoading}
              >
                <SelectTrigger
                  id="schema"
                  className={errors.schemaId ? 'border-destructive' : ''}
                >
                  <SelectValue placeholder="Select a schema" />
                </SelectTrigger>
                <SelectContent>
                  {schemas.map((schema) => (
                    <SelectItem key={schema.id} value={schema.id}>
                      {schema.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.schemaId && (
                <p className="text-sm text-destructive">{errors.schemaId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="websiteUrl">Website URL</Label>
              <Input
                id="websiteUrl"
                type="url"
                placeholder="https://example.com"
                {...register('websiteUrl')}
                className={errors.websiteUrl ? 'border-destructive' : ''}
              />
              {errors.websiteUrl && (
                <p className="text-sm text-destructive">{errors.websiteUrl.message}</p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting || createMutation.isPending}
            >
              Create Submission
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
