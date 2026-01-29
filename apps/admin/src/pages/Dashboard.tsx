import {
  Box,
  Heading,
  Text,
  Card,
  CardBody,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
} from '@chakra-ui/react'
import { useAuth } from '@/hooks/useAuth'

export function Dashboard() {
  const { user } = useAuth()

  return (
    <Box>
      <Box mb={8}>
        <Heading size="lg" mb={2}>
          Welcome back
        </Heading>
        <Text color="text.muted">
          {user?.email}
        </Text>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={6}>
        <Card variant="outline">
          <CardBody>
            <Stat>
              <StatLabel color="text.muted">Total Schemas</StatLabel>
              <StatNumber>0</StatNumber>
              <StatHelpText>No schemas yet</StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card variant="outline">
          <CardBody>
            <Stat>
              <StatLabel color="text.muted">Active Submissions</StatLabel>
              <StatNumber>0</StatNumber>
              <StatHelpText>No submissions</StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card variant="outline">
          <CardBody>
            <Stat>
              <StatLabel color="text.muted">Webhooks</StatLabel>
              <StatNumber>0</StatNumber>
              <StatHelpText>No webhooks configured</StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card variant="outline">
          <CardBody>
            <Stat>
              <StatLabel color="text.muted">API Calls</StatLabel>
              <StatNumber>0</StatNumber>
              <StatHelpText>This month</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      <Card variant="filled" mt={8}>
        <CardBody>
          <Text color="text.muted" textAlign="center">
            Get started by creating your first schema in the Schemas section.
          </Text>
        </CardBody>
      </Card>
    </Box>
  )
}
