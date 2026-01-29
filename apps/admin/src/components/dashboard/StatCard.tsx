import {
  Card,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  HStack,
  Box,
  Skeleton,
} from '@chakra-ui/react'
import type { ReactNode } from 'react'

interface StatCardProps {
  icon: ReactNode
  label: string
  value: number | string
  helpText?: string
  colorScheme?: 'brand' | 'success' | 'warning' | 'error'
  isLoading?: boolean
}

export function StatCard({
  icon,
  label,
  value,
  helpText,
  colorScheme = 'brand',
  isLoading = false,
}: StatCardProps) {
  const iconColor = {
    brand: 'interactive.default',
    success: 'status.success',
    warning: 'status.warning',
    error: 'status.error',
  }[colorScheme]

  const iconBg = {
    brand: 'interactive.muted',
    success: 'status.success.bg',
    warning: 'status.warning.bg',
    error: 'status.error.bg',
  }[colorScheme]

  if (isLoading) {
    return (
      <Card variant="outline">
        <CardBody>
          <HStack spacing={4} align="flex-start">
            <Skeleton boxSize={10} borderRadius="lg" />
            <Box flex={1}>
              <Skeleton h={4} w="60%" mb={2} />
              <Skeleton h={8} w="40%" mb={2} />
              <Skeleton h={3} w="80%" />
            </Box>
          </HStack>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card variant="outline">
      <CardBody>
        <HStack spacing={4} align="flex-start">
          <Box
            p={2}
            borderRadius="lg"
            bg={iconBg}
            color={iconColor}
          >
            {icon}
          </Box>
          <Stat>
            <StatLabel color="text.muted">{label}</StatLabel>
            <StatNumber fontSize="2xl">{value}</StatNumber>
            {helpText && (
              <StatHelpText mb={0} color="text.subtle">
                {helpText}
              </StatHelpText>
            )}
          </Stat>
        </HStack>
      </CardBody>
    </Card>
  )
}
