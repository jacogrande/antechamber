import { apiGet, apiPost } from './client'
import type {
  SubmissionsListResponse,
  SubmissionDetailResponse,
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

export interface CreateSubmissionParams {
  schemaId: string
  websiteUrl: string
  schemaVersion?: number
  customerMeta?: Record<string, unknown>
}

export interface CreateSubmissionResponse {
  submissionId: string
  workflowRunId: string
}

export async function createSubmission(
  params: CreateSubmissionParams
): Promise<CreateSubmissionResponse> {
  return apiPost<CreateSubmissionResponse>('/submissions', params)
}

export async function getSubmission(id: string): Promise<SubmissionDetailResponse> {
  return apiGet<SubmissionDetailResponse>(`/submissions/${id}`)
}

export interface FieldEdit {
  fieldKey: string
  value: unknown
}

export interface ConfirmSubmissionParams {
  edits?: FieldEdit[]
}

export async function confirmSubmission(id: string, params?: ConfirmSubmissionParams): Promise<void> {
  return apiPost<void>(`/submissions/${id}/confirm`, {
    confirmedBy: 'internal',
    edits: params?.edits,
  })
}
