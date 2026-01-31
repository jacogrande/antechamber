import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useLocation } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { useCreateTenant } from '@/hooks/useTenantSetup'
import { ApiError } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

const orgSetupSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(100),
})

type OrgSetupForm = z.infer<typeof orgSetupSchema>

/**
 * Generate a URL-friendly slug from a name (for preview only).
 * NOTE: This logic is duplicated in src/routes/tenants.ts for server-side generation.
 * Keep them in sync if modifying.
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function OrganizationSetup() {
  const navigate = useNavigate()
  const location = useLocation()
  const createTenant = useCreateTenant()
  const [error, setError] = useState<string | null>(null)

  // Restore original destination after org setup (from TenantGuard redirect)
  const from = (location.state as { from?: Location })?.from?.pathname || '/'

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<OrgSetupForm>({
    resolver: zodResolver(orgSetupSchema),
    defaultValues: {
      name: '',
    },
  })

  const nameValue = watch('name')
  const slugPreview = useMemo(() => generateSlug(nameValue || ''), [nameValue])

  const onSubmit = async (data: OrgSetupForm) => {
    setError(null)
    try {
      await createTenant.mutateAsync({ name: data.name })
      toast.success('Organization created', {
        description: `Welcome to ${data.name}!`,
      })
      navigate(from, { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'CONFLICT') {
          setError('An organization with this name already exists. Please choose a different name.')
        } else {
          setError(err.message)
        }
      } else {
        setError('Failed to create organization. Please try again.')
      }
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center pb-0">
          <h1 className="text-2xl font-semibold text-primary">
            Create your organization
          </h1>
          <p className="mt-2 text-muted-foreground">
            Set up your organization to get started
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Organization name</Label>
                <Input
                  id="name"
                  placeholder="Acme Inc."
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
                {slugPreview && !errors.name && (
                  <p className="text-sm text-muted-foreground">
                    Your URL: <span className="font-mono">{slugPreview}</span>
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                isLoading={isSubmitting || createTenant.isPending}
              >
                Create organization
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
