import { useState } from 'react'
import {
  Box,
  Heading,
  Card,
  CardBody,
  CardHeader,
  VStack,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Text,
  Input,
  Button,
  ButtonGroup,
  useColorMode,
  useToast,
  Skeleton,
} from '@chakra-ui/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/hooks/useTenant'

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
      <Card variant="outline">
        <CardHeader>
          <Heading size="sm">Organization</Heading>
        </CardHeader>
        <CardBody pt={0}>
          <VStack spacing={4} align="stretch">
            <Box>
              <Skeleton h={4} w="60px" mb={2} />
              <Skeleton h={5} w="150px" />
            </Box>
            <Box>
              <Skeleton h={4} w="40px" mb={2} />
              <Skeleton h={5} w="120px" />
            </Box>
            <Box>
              <Skeleton h={4} w="70px" mb={2} />
              <Skeleton h={5} w="140px" />
            </Box>
          </VStack>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card variant="outline">
      <CardHeader>
        <Heading size="sm">Organization</Heading>
      </CardHeader>
      <CardBody pt={0}>
        <VStack spacing={4} align="stretch">
          <FormControl>
            <FormLabel color="text.muted" fontSize="sm">
              Name
            </FormLabel>
            <Text fontWeight="medium">{tenant?.name ?? '-'}</Text>
          </FormControl>
          <FormControl>
            <FormLabel color="text.muted" fontSize="sm">
              Slug
            </FormLabel>
            <Text fontFamily="mono" color="text.subtle">
              {tenant?.slug ?? '-'}
            </Text>
          </FormControl>
          <FormControl>
            <FormLabel color="text.muted" fontSize="sm">
              Created
            </FormLabel>
            <Text color="text.subtle">
              {tenant?.createdAt ? formatDate(tenant.createdAt) : '-'}
            </Text>
          </FormControl>
        </VStack>
      </CardBody>
    </Card>
  )
}

function AppearanceSection() {
  const { colorMode, toggleColorMode } = useColorMode()

  return (
    <Card variant="outline">
      <CardHeader>
        <Heading size="sm">Appearance</Heading>
      </CardHeader>
      <CardBody pt={0}>
        <FormControl>
          <FormLabel color="text.muted" fontSize="sm">
            Color Mode
          </FormLabel>
          <ButtonGroup size="sm" isAttached variant="outline">
            <Button
              onClick={() => colorMode !== 'light' && toggleColorMode()}
              variant={colorMode === 'light' ? 'solid' : 'outline'}
            >
              Light
            </Button>
            <Button
              onClick={() => colorMode !== 'dark' && toggleColorMode()}
              variant={colorMode === 'dark' ? 'solid' : 'outline'}
            >
              Dark
            </Button>
          </ButtonGroup>
        </FormControl>
      </CardBody>
    </Card>
  )
}

function ProfileSection() {
  const { user } = useAuth()

  return (
    <Card variant="outline">
      <CardHeader>
        <Heading size="sm">Profile</Heading>
      </CardHeader>
      <CardBody pt={0}>
        <VStack spacing={4} align="stretch">
          <FormControl>
            <FormLabel color="text.muted" fontSize="sm">
              Email
            </FormLabel>
            <Text>{user?.email ?? '-'}</Text>
          </FormControl>
        </VStack>
      </CardBody>
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
  const toast = useToast()
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
        toast({
          title: 'Failed to change password',
          description: error.message,
          status: 'error',
          duration: 5000,
        })
      } else {
        toast({
          title: 'Password changed',
          description: 'Your password has been updated successfully.',
          status: 'success',
          duration: 5000,
        })
        reset()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card variant="outline">
      <CardHeader>
        <Heading size="sm">Change Password</Heading>
      </CardHeader>
      <CardBody pt={0}>
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
          <VStack spacing={4} align="stretch">
            <FormControl isInvalid={!!errors.newPassword}>
              <FormLabel color="text.muted" fontSize="sm">
                New Password
              </FormLabel>
              <Input
                type="password"
                placeholder="Enter new password"
                {...register('newPassword')}
              />
              <FormErrorMessage>{errors.newPassword?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.confirmPassword}>
              <FormLabel color="text.muted" fontSize="sm">
                Confirm Password
              </FormLabel>
              <Input
                type="password"
                placeholder="Confirm new password"
                {...register('confirmPassword')}
              />
              <FormErrorMessage>{errors.confirmPassword?.message}</FormErrorMessage>
            </FormControl>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              alignSelf="flex-start"
              isLoading={isSubmitting}
            >
              Update Password
            </Button>
          </VStack>
        </form>
      </CardBody>
    </Card>
  )
}

export function Settings() {
  return (
    <Box>
      <Heading size="lg" mb={8}>
        Settings
      </Heading>

      <VStack spacing={6} align="stretch" maxW="2xl">
        <OrganizationSection />
        <AppearanceSection />
        <ProfileSection />
        <PasswordSection />
      </VStack>
    </Box>
  )
}
