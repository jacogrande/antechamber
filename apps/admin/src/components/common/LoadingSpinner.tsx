import { Center, Spinner } from '@chakra-ui/react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function LoadingSpinner({ size = 'lg' }: LoadingSpinnerProps) {
  return (
    <Center py={16}>
      <Spinner size={size} color="brand.600" thickness="3px" />
    </Center>
  )
}
