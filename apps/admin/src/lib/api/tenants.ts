import { apiPostNoTenant } from './client'

export interface CreateTenantInput {
  name: string
  slug?: string
}

export interface CreateTenantResponse {
  tenant: {
    id: string
    name: string
    slug: string
    createdAt: string
  }
  membership: {
    role: 'admin'
  }
}

/**
 * Create a new tenant/organization.
 * Uses apiPostNoTenant since we don't have a tenant ID yet.
 */
export async function createTenant(input: CreateTenantInput): Promise<CreateTenantResponse> {
  return apiPostNoTenant<CreateTenantResponse>('/tenants', input)
}
