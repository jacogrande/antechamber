import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

interface TenantGuardProps {
  children: ReactNode
}

export function TenantGuard({ children }: TenantGuardProps) {
  const location = useLocation()
  const tenantId = localStorage.getItem('tenantId')

  if (!tenantId) {
    // Redirect to organization setup, preserving the intended destination
    return <Navigate to="/setup/org" state={{ from: location }} replace />
  }

  return <>{children}</>
}
