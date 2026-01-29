import { useState } from 'react'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Heading,
  Input,
  VStack,
  Text,
  Link as ChakraLink,
  Alert,
  AlertIcon,
  Center,
} from '@chakra-ui/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

const signupSchema = z
  .object({
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type SignupForm = z.infer<typeof signupSchema>

export function Signup() {
  const { signUp } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupForm) => {
    setError(null)
    const result = await signUp(data.email, data.password)
    if (result.error) {
      setError(result.error.message)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <Center minH="100vh" bg="bg.canvas" p={4}>
        <Card maxW="md" w="full" variant="outline">
          <CardBody>
            <VStack spacing={4} textAlign="center">
              <Text fontSize="4xl">📧</Text>
              <Heading size="md">Check your email</Heading>
              <Text color="text.muted">
                We've sent you a verification link. Please check your email to
                complete your registration.
              </Text>
              <ChakraLink as={Link} to="/login" color="brand.600">
                Back to login
              </ChakraLink>
            </VStack>
          </CardBody>
        </Card>
      </Center>
    )
  }

  return (
    <Center minH="100vh" bg="bg.canvas" p={4}>
      <Card maxW="md" w="full" variant="outline">
        <CardHeader textAlign="center" pb={0}>
          <Heading size="lg" color="brand.600">
            Onboarding
          </Heading>
          <Text mt={2} color="text.muted">
            Create your account
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

              <FormControl isInvalid={!!errors.email}>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  {...register('email')}
                />
                <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.password}>
                <FormLabel>Password</FormLabel>
                <Input
                  type="password"
                  placeholder="Create a password"
                  {...register('password')}
                />
                <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.confirmPassword}>
                <FormLabel>Confirm Password</FormLabel>
                <Input
                  type="password"
                  placeholder="Confirm your password"
                  {...register('confirmPassword')}
                />
                <FormErrorMessage>
                  {errors.confirmPassword?.message}
                </FormErrorMessage>
              </FormControl>

              <Button
                type="submit"
                variant="primary"
                w="full"
                isLoading={isSubmitting}
              >
                Create account
              </Button>

              <Text fontSize="sm" color="text.muted">
                Already have an account?{' '}
                <ChakraLink as={Link} to="/login" color="brand.600">
                  Sign in
                </ChakraLink>
              </Text>
            </VStack>
          </form>
        </CardBody>
      </Card>
    </Center>
  )
}
