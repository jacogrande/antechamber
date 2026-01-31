import { Spinner } from '@/components/ui/spinner'

interface LoadingSpinnerProps {
  size?: 'sm' | 'default' | 'lg'
}

export function LoadingSpinner({ size = 'lg' }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center py-16">
      <Spinner size={size} />
    </div>
  )
}
