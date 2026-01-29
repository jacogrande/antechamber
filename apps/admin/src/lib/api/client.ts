import { supabase } from '@/lib/supabase'

const API_BASE = '/api'

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

function getTenantId(): string {
  const tenantId = localStorage.getItem('tenantId')
  if (!tenantId) {
    throw new ApiError(400, 'NO_TENANT', 'No tenant selected')
  }
  return tenantId
}

export function setTenantId(tenantId: string): void {
  localStorage.setItem('tenantId', tenantId)
}

export function clearTenantId(): void {
  localStorage.removeItem('tenantId')
}

async function getAuthHeaders(): Promise<Headers> {
  const headers = new Headers({
    'Content-Type': 'application/json',
  })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`)
  }

  try {
    const tenantId = getTenantId()
    headers.set('X-Tenant-ID', tenantId)
  } catch {
    // No tenant selected - some endpoints may not require it
  }

  return headers
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: ErrorResponse | null = null
    try {
      errorData = await response.json()
    } catch {
      // Response body may not be JSON
    }

    throw new ApiError(
      response.status,
      errorData?.error?.code ?? 'UNKNOWN_ERROR',
      errorData?.error?.message ?? response.statusText,
      errorData?.error?.details
    )
  }

  return response.json()
}

export async function apiGet<T>(path: string): Promise<T> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers,
  })
  return handleResponse<T>(response)
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  return handleResponse<T>(response)
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  return handleResponse<T>(response)
}

export async function apiDelete<T>(path: string): Promise<T> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers,
  })
  return handleResponse<T>(response)
}
