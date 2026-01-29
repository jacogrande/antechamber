import { Badge, HStack, Box } from '@chakra-ui/react'
import type { SubmissionStatus } from '@/types/submission'

interface SubmissionStatusBadgeProps {
  status: SubmissionStatus
}

const statusConfig: Record<
  SubmissionStatus,
  { label: string; variant: string; dotColor: string }
> = {
  pending: {
    label: 'Pending',
    variant: 'subtle',
    dotColor: 'text.subtle',
  },
  draft: {
    label: 'Draft',
    variant: 'warning',
    dotColor: 'status.warning',
  },
  confirmed: {
    label: 'Confirmed',
    variant: 'success',
    dotColor: 'status.success',
  },
  failed: {
    label: 'Failed',
    variant: 'error',
    dotColor: 'status.error',
  },
}

export function SubmissionStatusBadge({ status }: SubmissionStatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <Badge variant={config.variant} px={2} py={0.5}>
      <HStack spacing={1.5}>
        <Box
          w={2}
          h={2}
          borderRadius="full"
          bg={config.dotColor}
        />
        <span>{config.label}</span>
      </HStack>
    </Badge>
  )
}
