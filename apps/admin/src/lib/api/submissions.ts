import { apiGet } from './client'
import type {
  SubmissionsListResponse,
  SubmissionStatus,
} from '@/types/submission'

export interface ListSubmissionsParams {
  status?: SubmissionStatus
  limit?: number
  offset?: number
}

export async function listSubmissions(
  params: ListSubmissionsParams = {}
): Promise<SubmissionsListResponse> {
  const searchParams = new URLSearchParams()
  if (params.status) searchParams.set('status', params.status)
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.offset) searchParams.set('offset', String(params.offset))

  const query = searchParams.toString()
  const path = query ? `/submissions?${query}` : '/submissions'
  return apiGet<SubmissionsListResponse>(path)
}
