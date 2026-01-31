import { RefreshCw, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

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
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between flex-1">
        <span>{message}</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={onRetry}
          disabled={isRetrying}
          className="ml-4"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? 'Retrying' : 'Retry'}
        </Button>
      </AlertDescription>
    </Alert>
  )
}
