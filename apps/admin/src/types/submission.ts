export type SubmissionStatus = 'pending' | 'draft' | 'confirmed' | 'failed'

export interface Submission {
  id: string
  schemaId: string
  schemaName: string | null
  websiteUrl: string
  status: SubmissionStatus
  createdAt: string
  updatedAt: string
}

export interface SubmissionsListResponse {
  submissions: Submission[]
  total: number
  hasMore: boolean
}

export interface DashboardStats {
  schemas: { total: number }
  submissions: {
    total: number
    pending: number
    draft: number
    confirmed: number
    failed: number
  }
  webhooks: { active: number }
}

export interface Tenant {
  id: string
  name: string
  slug: string
  createdAt: string
}

export interface TenantResponse {
  tenant: Tenant
}
