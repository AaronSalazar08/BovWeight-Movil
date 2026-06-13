import client from './client'

export interface RegistroPeso {
  id: number
  ganado_id: number
  peso_estimado: number
  peso_corregido: number | null
  fecha: string
  confianza: number | null
  metodo: string
  imagen_path: string | null
  raza_estimacion: string | null
  created_at: string
}

export const getHistorialPeso = async (ganadoId: number): Promise<RegistroPeso[]> => {
  const response = await client.get(`/ganado/${ganadoId}/historial`)
  return response.data
}
