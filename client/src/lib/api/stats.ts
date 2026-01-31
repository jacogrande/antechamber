import { apiGet } from './client'
import type { DashboardStats, TenantResponse } from '@/types/submission'

export async function getStats(): Promise<DashboardStats> {
  return apiGet<DashboardStats>('/stats')
}

export async function getTenant(): Promise<TenantResponse> {
  return apiGet<TenantResponse>('/tenant')
}
