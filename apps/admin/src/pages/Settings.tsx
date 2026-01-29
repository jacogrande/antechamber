import {
  Box,
  Heading,
  Card,
  CardBody,
  CardHeader,
  VStack,
  FormControl,
  FormLabel,
  Text,
  Button,
  ButtonGroup,
  useColorMode,
  Skeleton,
} from '@chakra-ui/react'
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
      </VStack>
    </Box>
  )
}
