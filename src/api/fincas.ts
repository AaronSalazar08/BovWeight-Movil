import client from './client'
import apiClient from './client'

export interface Finca {
  id: number
  usuario_id: number
  nombre: string
  ubicacion: string
  area: number
  numero_finca: string
}

export const getFincas = async (): Promise<Finca[]> => {
  const response = await apiClient.get('/fincas')
  return response.data
}

export const getFinca = async (id: number): Promise<Finca> => {
  const response = await apiClient.get(`/fincas/${id}`)
  return response.data
}

export async function createFinca(data: Partial<Finca>) {

  const response = await client.post('/fincas', data)

  return response.data

}

export async function updateFinca(
  id: number,
  data: Partial<Finca>
) {

  const response = await client.put(`/fincas/${id}`, data)

  return response.data

}

export const deleteFinca = async (id: number): Promise<void> => {
  await apiClient.delete(`/fincas/${id}`)
}