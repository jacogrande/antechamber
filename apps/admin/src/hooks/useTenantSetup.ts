import { useMutation } from '@tanstack/react-query'
import { createTenant, type CreateTenantInput, type CreateTenantResponse } from '@/lib/api/tenants'
import { setTenantId } from '@/lib/api/client'

export function useCreateTenant() {
  return useMutation({
    mutationFn: (input: CreateTenantInput) => createTenant(input),
    onSuccess: (data: CreateTenantResponse) => {
      // Set the newly created tenant as the active tenant
      setTenantId(data.tenant.id)
    },
  })
}
