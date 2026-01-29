import { Alert, AlertIcon, Button, HStack, Text } from '@chakra-ui/react'
import { HiRefresh } from 'react-icons/hi'

interface RetryableAlertProps {
  message: string
  onRetry: () => void
  isRetrying?: boolean
}

export function RetryableAlert({
  message,
  onRetry,
  isRetrying = false,
}: RetryableAlertProps) {
  return (
    <Alert status="error" borderRadius="lg">
      <AlertIcon />
      <HStack justify="space-between" flex={1}>
        <Text>{message}</Text>
        <Button
          size="sm"
          variant="ghost"
          leftIcon={<HiRefresh />}
          onClick={onRetry}
          isLoading={isRetrying}
          loadingText="Retrying"
        >
          Retry
        </Button>
      </HStack>
    </Alert>
  )
}
