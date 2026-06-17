import client from './client'

export interface SolicitudVeterinarioPayload {
  finca_id: number
  correo_veterinario: string
}

export const solicitudesVetApi = {
  create: (payload: SolicitudVeterinarioPayload) =>
    client.post<{ message: string }>('/solicitudes-veterinario', payload),
}
