import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listSubmissions,
  createSubmission,
  getSubmission,
  confirmSubmission,
  type ListSubmissionsParams,
  type CreateSubmissionParams,
  type ConfirmSubmissionParams,
} from '@/lib/api/submissions'
import { getStats } from '@/lib/api/stats'

export const submissionKeys = {
  all: ['submissions'] as const,
  lists: () => [...submissionKeys.all, 'list'] as const,
  list: (params?: ListSubmissionsParams) => [...submissionKeys.lists(), params] as const,
  details: () => [...submissionKeys.all, 'detail'] as const,
  detail: (id: string) => [...submissionKeys.details(), id] as const,
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

export function useSubmission(id: string | undefined) {
  return useQuery({
    queryKey: submissionKeys.detail(id!),
    queryFn: () => getSubmission(id!),
    enabled: !!id,
  })
}

export function useConfirmSubmission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, params }: { id: string; params?: ConfirmSubmissionParams }) =>
      confirmSubmission(id, params),
    onSuccess: (_data, { id }) => {
      // Invalidate the specific submission detail
      void queryClient.invalidateQueries({ queryKey: submissionKeys.detail(id) })
      // Invalidate submissions list
      void queryClient.invalidateQueries({ queryKey: submissionKeys.lists() })
      // Invalidate stats
      void queryClient.invalidateQueries({ queryKey: statsKeys.all })
    },
  })
}
