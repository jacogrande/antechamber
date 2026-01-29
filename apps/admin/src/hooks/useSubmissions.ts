import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listSubmissions,
  createSubmission,
  type ListSubmissionsParams,
  type CreateSubmissionParams,
} from '@/lib/api/submissions'
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

export function useCreateSubmission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: CreateSubmissionParams) => createSubmission(params),
    onSuccess: () => {
      // Invalidate submissions list to refetch
      void queryClient.invalidateQueries({ queryKey: submissionKeys.all })
      // Also invalidate stats since submission count changed
      void queryClient.invalidateQueries({ queryKey: statsKeys.all })
    },
  })
}

export function useStats() {
  return useQuery({
    queryKey: statsKeys.dashboard(),
    queryFn: getStats,
  })
}
