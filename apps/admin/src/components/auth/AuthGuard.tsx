import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Center, Spinner } from '@chakra-ui/react'
import { useAuth } from '@/hooks/useAuth'

interface AuthGuardProps {
  children: ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" color="brand.500" thickness="3px" />
      </Center>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
