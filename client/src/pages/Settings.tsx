import { useState } from 'react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTheme } from 'next-themes'
import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/hooks/useTenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function OrganizationSection() {
  const { data: tenant, isLoading } = useTenant()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Skeleton className="h-4 w-[60px] mb-2" />
            <Skeleton className="h-5 w-[150px]" />
          </div>
          <div>
            <Skeleton className="h-4 w-[40px] mb-2" />
            <Skeleton className="h-5 w-[120px]" />
          </div>
          <div>
            <Skeleton className="h-4 w-[70px] mb-2" />
            <Skeleton className="h-5 w-[140px]" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Organization</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-muted-foreground text-sm">Name</Label>
          <p className="font-medium">{tenant?.name ?? '-'}</p>
        </div>
        <div>
          <Label className="text-muted-foreground text-sm">Slug</Label>
          <p className="font-mono text-muted-foreground">{tenant?.slug ?? '-'}</p>
        </div>
        <div>
          <Label className="text-muted-foreground text-sm">Created</Label>
          <p className="text-muted-foreground">
            {tenant?.createdAt ? formatDate(tenant.createdAt) : '-'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Appearance</CardTitle>
      </CardHeader>
      <CardContent>
        <div>
          <Label className="text-muted-foreground text-sm mb-2 block">
            Color Mode
          </Label>
          <div className="flex">
            <Button
              variant={theme === 'light' ? 'default' : 'outline'}
              size="sm"
              className="rounded-r-none"
              onClick={() => setTheme('light')}
            >
              Light
            </Button>
            <Button
              variant={theme === 'dark' ? 'default' : 'outline'}
              size="sm"
              className="rounded-l-none border-l-0"
              onClick={() => setTheme('dark')}
            >
              Dark
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ProfileSection() {
  const { user } = useAuth()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <div>
          <Label className="text-muted-foreground text-sm">Email</Label>
          <p>{user?.email ?? '-'}</p>
        </div>
      </CardContent>
    </Card>
  )
}

const passwordSchema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

type PasswordFormData = z.infer<typeof passwordSchema>

function PasswordSection() {
  const { changePassword } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  })

  const onSubmit = async (data: PasswordFormData) => {
    setIsSubmitting(true)
    try {
      const { error } = await changePassword(data.newPassword)
      if (error) {
        toast.error('Failed to change password', {
          description: error.message,
        })
      } else {
        toast.success('Password changed', {
          description: 'Your password has been updated successfully.',
        })
        reset()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Change Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-muted-foreground text-sm">
                New Password
              </Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Enter new password"
                {...register('newPassword')}
              />
              {errors.newPassword && (
                <p className="text-sm text-destructive">{errors.newPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-muted-foreground text-sm">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" size="sm" isLoading={isSubmitting}>
              Update Password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export function Settings() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-8">Settings</h1>

      <div className="space-y-6 max-w-2xl">
        <OrganizationSection />
        <AppearanceSection />
        <ProfileSection />
        <PasswordSection />
      </div>
    </div>
  )
}
