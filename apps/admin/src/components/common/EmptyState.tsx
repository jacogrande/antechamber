import { VStack, Icon, Heading, Text, Button } from '@chakra-ui/react'
import type { IconType } from 'react-icons'

interface EmptyStateProps {
  icon: IconType
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <VStack
      spacing={4}
      py={16}
      px={8}
      textAlign="center"
      color="text.muted"
    >
      <Icon as={icon} boxSize={12} />
      <VStack spacing={2}>
        <Heading size="md" color="text.default">
          {title}
        </Heading>
        <Text maxW="sm">{description}</Text>
      </VStack>
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </VStack>
  )
}
