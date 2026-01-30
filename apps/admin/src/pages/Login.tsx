import { useState } from 'react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth, type TenantInfo } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, selectTenant } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [tenants, setTenants] = useState<TenantInfo[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const from = (location.state as { from?: Location })?.from?.pathname || '/'

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setError(null)
    const result = await signIn(data.email, data.password)
    if (result.error) {
      setError(result.error.message)
    } else if (result.tenants && result.tenants.length > 1) {
      // Multiple tenants - show picker
      setTenants(result.tenants)
      setSelectedTenantId(result.tenants[0].id)
      setIsModalOpen(true)
    } else if (result.tenants && result.tenants.length === 0) {
      // No tenants - redirect to organization setup
      navigate('/setup/org', { replace: true })
    } else {
      // Single tenant - already selected by useAuth
      toast.success('Welcome back!')
      navigate(from, { replace: true })
    }
  }

  const handleTenantSelect = () => {
    if (selectedTenantId) {
      selectTenant(selectedTenantId)
      setIsModalOpen(false)
      toast.success('Welcome back!')
      navigate(from, { replace: true })
    }
  }

  return (
    <>
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-1/4 -left-1/4 w-[500px] h-[500px] rounded-full bg-green-500/5 blur-[100px] pointer-events-none" />

        <Card className="max-w-[400px] w-full rounded-2xl">
          <CardHeader className="text-center pt-8 pb-2 px-8">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-xl font-bold text-primary-foreground">A</span>
              </div>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to your account to continue
            </p>
          </CardHeader>
          <CardContent className="pt-4 pb-8 px-8">
            <form onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
              <div className="space-y-5">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-muted-foreground">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="h-11"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-muted-foreground">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    className="h-11"
                    {...register('password')}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 mt-2"
                  isLoading={isSubmitting}
                >
                  Sign in
                </Button>

                <p className="text-sm text-muted-foreground text-center">
                  Don't have an account?{' '}
                  <Link
                    to="/signup"
                    className="text-primary font-medium hover:underline"
                  >
                    Sign up
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Organization</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4 text-sm text-muted-foreground">
              You have access to multiple organizations. Please select one to continue.
            </p>
            <RadioGroup value={selectedTenantId} onValueChange={setSelectedTenantId}>
              <div className="space-y-3">
                {tenants.map((tenant) => (
                  <div
                    key={tenant.id}
                    className={cn(
                      'p-3 rounded-lg border cursor-pointer transition-all',
                      selectedTenantId === tenant.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary'
                    )}
                    onClick={() => setSelectedTenantId(tenant.id)}
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value={tenant.id} id={tenant.id} />
                      <div>
                        <Label htmlFor={tenant.id} className="font-medium text-sm cursor-pointer">
                          {tenant.name}
                        </Label>
                        <p className="text-xs text-muted-foreground">{tenant.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button onClick={handleTenantSelect} className="w-full">
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
