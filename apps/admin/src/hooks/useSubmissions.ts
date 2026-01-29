import { useQuery } from '@tanstack/react-query'
import { listSubmissions, type ListSubmissionsParams } from '@/lib/api/submissions'
import { getStats } from '@/lib/api/stats'

export const submissionKeys = {
  all: ['submissions'] as const,
  lists: () => [...submissionKeys.all, 'list'] as const,
  list: (params?: ListSubmissionsParams) => [...submissionKeys.lists(), params] as const,
}

export const statsKeys = {
  all: ['stats'] as const,
  dashboard: () => [...statsKeys.all, 'dashboard'] as const,
}

export function useSubmissions(params: ListSubmissionsParams = {}) {
  return useQuery({
    queryKey: submissionKeys.list(params),
    queryFn: () => listSubmissions(params),
  })
}

export function useStats() {
  return useQuery({
    queryKey: statsKeys.dashboard(),
    queryFn: getStats,
  })
}
