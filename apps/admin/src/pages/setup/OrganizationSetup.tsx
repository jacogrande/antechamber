import { useState, useMemo } from 'react'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
  Heading,
  Input,
  VStack,
  Text,
  Alert,
  AlertIcon,
  Center,
  useToast,
} from '@chakra-ui/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useLocation } from 'react-router-dom'
import { useCreateTenant } from '@/hooks/useTenantSetup'
import { ApiError } from '@/lib/api/client'

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
  const toast = useToast()
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
      toast({
        title: 'Organization created',
        description: `Welcome to ${data.name}!`,
        status: 'success',
        duration: 3000,
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
    <Center minH="100vh" bg="bg.canvas" p={4}>
      <Card maxW="md" w="full" variant="outline">
        <CardHeader textAlign="center" pb={0}>
          <Heading size="lg" color="brand.600">
            Create your organization
          </Heading>
          <Text mt={2} color="text.muted">
            Set up your organization to get started
          </Text>
        </CardHeader>
        <CardBody>
          <form onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
            <VStack spacing={4}>
              {error && (
                <Alert status="error" borderRadius="lg">
                  <AlertIcon />
                  {error}
                </Alert>
              )}

              <FormControl isInvalid={!!errors.name}>
                <FormLabel>Organization name</FormLabel>
                <Input
                  placeholder="Acme Inc."
                  {...register('name')}
                />
                <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
                {slugPreview && !errors.name && (
                  <FormHelperText>
                    Your URL: <Text as="span" fontFamily="mono">{slugPreview}</Text>
                  </FormHelperText>
                )}
              </FormControl>

              <Button
                type="submit"
                variant="primary"
                w="full"
                isLoading={isSubmitting || createTenant.isPending}
              >
                Create organization
              </Button>
            </VStack>
          </form>
        </CardBody>
      </Card>
    </Center>
  )
}
