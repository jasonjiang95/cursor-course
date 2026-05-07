import type { HealthResponse } from '../types/api'
import { fetchJson } from './client'

export async function getHealth(): Promise<HealthResponse> {
  return fetchJson<HealthResponse>('/health')
}
