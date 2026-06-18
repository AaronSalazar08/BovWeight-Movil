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

export interface RegistroPesoConGanado extends RegistroPeso {
  ganado: {
    id: number
    nombre: string | null
    arete: string
    raza: string
    imagen: string | null
  }
}

export const getHistorialPeso = async (ganadoId: number): Promise<RegistroPeso[]> => {
  const response = await client.get(`/ganado/${ganadoId}/historial`)
  return response.data
}

export const getPesajesRecientes = async (limit = 5): Promise<RegistroPesoConGanado[]> => {
  const response = await client.get('/pesajes/recientes', { params: { limit } })
  return response.data
}
