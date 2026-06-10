import client from './client'

export interface Ganado {
  id: number
  finca_id: number
  estado_salud_id: number
  estado_comercial_id: number
  arete: string
  nombre: string | null
  sexo: 'Macho' | 'Hembra'
  raza: string
  imagen: string | null
  peso_kg?: number | null
  estado_salud?: { id: number; nombre: string }
  estado_comercial?: { id: number; nombre: string }
  finca?: { id: number; nombre: string }
}

export interface CreateGanadoPayload {
  finca_id: number
  estado_salud_id: number
  estado_comercial_id: number
  arete: string
  nombre?: string
  sexo?: 'Macho' | 'Hembra'
  raza: string
  peso_kg?: number
  imagen?: string
}

export interface Catalogo {
  id: number
  nombre: string
}

export const getGanado = async (id: number): Promise<Ganado> => {
  const response = await client.get(`/ganado/${id}`)
  return response.data
}

export const getGanadoPorFinca = async (fincaId: number): Promise<Ganado[]> => {
  const response = await client.get('/ganado', { params: { finca_id: fincaId } })
  return response.data
}

export const getTodoElGanado = async (): Promise<Ganado[]> => {
  const response = await client.get('/ganado')
  return response.data
}

export const createGanado = async (data: CreateGanadoPayload): Promise<Ganado> => {
  const response = await client.post('/ganado', data)
  return response.data.data
}

export const updateGanado = async (id: number, data: Partial<CreateGanadoPayload>): Promise<Ganado> => {
  const response = await client.put(`/ganado/${id}`, data)
  return response.data.data
}

export const deleteGanado = async (id: number): Promise<void> => {
  await client.delete(`/ganado/${id}`)
}

export const registrarPeso = async (id: number, peso: number): Promise<void> => {
  await client.post(`/ganado/${id}/peso`, { peso })
}

export const getEstadosSalud = async (): Promise<Catalogo[]> => {
  const response = await client.get('/catalogos/estados-salud')
  return response.data
}

export const getEstadosComerciales = async (): Promise<Catalogo[]> => {
  const response = await client.get('/catalogos/estados-comerciales')
  return response.data
}
