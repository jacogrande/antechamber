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

// Workflow types
export type WorkflowStepStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface WorkflowStep {
  name: string
  status: WorkflowStepStatus
  startedAt?: string
  completedAt?: string
  error?: string
}

// Citation for extracted field values
export interface Citation {
  sourceUrl: string
  snippetText: string
  confidence: number
}

// Extracted field value
export type ExtractedFieldStatus = 'found' | 'not_found' | 'unknown'

export interface ExtractedFieldValue {
  fieldKey: string
  fieldLabel: string
  fieldType?: 'string' | 'number' | 'boolean' | 'enum' | 'string[]'
  value: unknown
  status: ExtractedFieldStatus
  confidence: number
  reason?: string
  citations: Citation[]
}

// Crawl artifact
export interface CrawlArtifact {
  url: string
  pageType: string
  fetchedAt: string
  statusCode: number
}

// Submission detail
export interface SubmissionDetail extends Submission {
  workflowRunId: string | null
  workflowSteps?: WorkflowStep[]
  extractedFields?: ExtractedFieldValue[]
  artifacts?: CrawlArtifact[]
  confirmedAt?: string
  confirmedBy?: string
}

export interface SubmissionDetailResponse {
  submission: SubmissionDetail
}
