import { HStack, VStack, Box, Text, Icon } from '@chakra-ui/react'
import { HiCheck, HiX } from 'react-icons/hi'
import type { WorkflowStep, WorkflowStepStatus } from '@/types/submission'

interface WorkflowProgressProps {
  steps: WorkflowStep[]
}

const statusStyles: Record<
  WorkflowStepStatus,
  { bg: string; borderColor: string; iconColor?: string }
> = {
  pending: {
    bg: 'bg.subtle',
    borderColor: 'border.default',
  },
  running: {
    bg: 'blue.50',
    borderColor: 'blue.400',
  },
  completed: {
    bg: 'green.50',
    borderColor: 'green.400',
    iconColor: 'green.500',
  },
  failed: {
    bg: 'red.50',
    borderColor: 'red.400',
    iconColor: 'red.500',
  },
}

function StepIcon({ status }: { status: WorkflowStepStatus }) {
  if (status === 'completed') {
    return <Icon as={HiCheck} color="green.500" boxSize={4} />
  }
  if (status === 'failed') {
    return <Icon as={HiX} color="red.500" boxSize={4} />
  }
  if (status === 'running') {
    return (
      <Box
        w={3}
        h={3}
        borderRadius="full"
        bg="blue.400"
        animation="pulse 1.5s ease-in-out infinite"
      />
    )
  }
  return <Box w={3} h={3} borderRadius="full" bg="gray.300" />
}

function formatStepName(name: string): string {
  // Convert snake_case or camelCase to Title Case
  return name
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function WorkflowProgress({ steps }: WorkflowProgressProps) {
  if (steps.length === 0) {
    return (
      <Text color="text.muted" fontSize="sm">
        No workflow steps recorded.
      </Text>
    )
  }

  return (
    <VStack spacing={0} align="stretch">
      {steps.map((step, index) => {
        const style = statusStyles[step.status]
        const isLast = index === steps.length - 1

        return (
          <HStack key={step.name} spacing={3} position="relative">
            {/* Connector line */}
            {!isLast && (
              <Box
                position="absolute"
                left="14px"
                top="32px"
                w="2px"
                h="calc(100% - 8px)"
                bg={step.status === 'completed' ? 'green.200' : 'border.default'}
              />
            )}

            {/* Step indicator */}
            <Box
              w={8}
              h={8}
              borderRadius="full"
              bg={style.bg}
              borderWidth={2}
              borderColor={style.borderColor}
              display="flex"
              alignItems="center"
              justifyContent="center"
              zIndex={1}
            >
              <StepIcon status={step.status} />
            </Box>

            {/* Step content */}
            <VStack align="start" spacing={0} py={2} flex={1}>
              <Text fontWeight="medium" fontSize="sm">
                {formatStepName(step.name)}
              </Text>
              {step.error && (
                <Text color="red.500" fontSize="xs">
                  {step.error}
                </Text>
              )}
              {step.completedAt && (
                <Text color="text.subtle" fontSize="xs">
                  Completed {new Date(step.completedAt).toLocaleTimeString()}
                </Text>
              )}
            </VStack>
          </HStack>
        )
      })}
    </VStack>
  )
}
