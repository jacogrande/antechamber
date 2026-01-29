import { Badge, HStack, Box } from '@chakra-ui/react'

interface WebhookStatusBadgeProps {
  isActive: boolean
}

export function WebhookStatusBadge({ isActive }: WebhookStatusBadgeProps) {
  return (
    <Badge
      variant={isActive ? 'success' : 'subtle'}
      px={2}
      py={0.5}
    >
      <HStack spacing={1.5}>
        <Box
          w={2}
          h={2}
          borderRadius="full"
          bg={isActive ? 'status.success' : 'text.subtle'}
        />
        <span>{isActive ? 'Active' : 'Inactive'}</span>
      </HStack>
    </Badge>
  )
}
