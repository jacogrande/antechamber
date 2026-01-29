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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  RadioGroup,
  Radio,
  Stack,
  useDisclosure,
  useToast,
} from '@chakra-ui/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth, type TenantInfo } from '@/hooks/useAuth'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, selectTenant } = useAuth()
  const toast = useToast()
  const [error, setError] = useState<string | null>(null)
  const [tenants, setTenants] = useState<TenantInfo[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')
  const { isOpen, onOpen, onClose } = useDisclosure()

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
      onOpen()
    } else if (result.tenants && result.tenants.length === 0) {
      // No tenants - redirect to organization setup
      navigate('/setup/org', { replace: true })
    } else {
      // Single tenant - already selected by useAuth
      toast({
        title: 'Welcome back!',
        status: 'success',
        duration: 3000,
      })
      navigate(from, { replace: true })
    }
  }

  const handleTenantSelect = () => {
    if (selectedTenantId) {
      selectTenant(selectedTenantId)
      onClose()
      toast({
        title: 'Welcome back!',
        status: 'success',
        duration: 3000,
      })
      navigate(from, { replace: true })
    }
  }

  return (
    <>
      <Center minH="100vh" bg="bg.canvas" p={4}>
        <Card maxW="md" w="full" variant="outline">
          <CardHeader textAlign="center" pb={0}>
            <Heading size="lg" color="brand.600">
              Onboarding
            </Heading>
            <Text mt={2} color="text.muted">
              Sign in to your account
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
                    placeholder="Enter your password"
                    {...register('password')}
                  />
                  <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
                </FormControl>

                <Button
                  type="submit"
                  variant="primary"
                  w="full"
                  isLoading={isSubmitting}
                >
                  Sign in
                </Button>

                <Text fontSize="sm" color="text.muted">
                  Don't have an account?{' '}
                  <ChakraLink as={Link} to="/signup" color="brand.600">
                    Sign up
                  </ChakraLink>
                </Text>
              </VStack>
            </form>
          </CardBody>
        </Card>
      </Center>

      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Select Organization</ModalHeader>
          <ModalBody>
            <Text mb={4} color="text.muted">
              You have access to multiple organizations. Please select one to continue.
            </Text>
            <RadioGroup value={selectedTenantId} onChange={setSelectedTenantId}>
              <Stack spacing={3}>
                {tenants.map((tenant) => (
                  <Radio key={tenant.id} value={tenant.id}>
                    <Text fontWeight="medium">{tenant.name}</Text>
                    <Text fontSize="sm" color="text.muted">
                      {tenant.role}
                    </Text>
                  </Radio>
                ))}
              </Stack>
            </RadioGroup>
          </ModalBody>
          <ModalFooter>
            <Button variant="primary" onClick={handleTenantSelect}>
              Continue
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
