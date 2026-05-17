import type { RegisterPayload } from '@/types'
import client from './client'

export const solicitudesApi = {
  create: (payload: RegisterPayload) =>
    client.post<{ message: string }>('/solicitudes', payload),
}
