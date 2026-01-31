import { useQuery } from '@tanstack/react-query'
import { getTenant } from '@/lib/api/stats'

export const tenantKeys = {
  all: ['tenant'] as const,
  current: () => [...tenantKeys.all, 'current'] as const,
}

export function useTenant() {
  return useQuery({
    queryKey: tenantKeys.current(),
    queryFn: getTenant,
    select: (data) => data.tenant,
  })
}
