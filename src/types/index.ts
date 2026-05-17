export interface User {
  id: number
  nombre: string
  correo: string
  tipo: string
  creado_en: string
}

export interface LoginCredentials {
  correo: string
  contrasena: string
}

export interface LoginResponse {
  token: string
  usuario: User
  message: string
}

export interface RegisterPayload {
  nombre: string
  apellidos: string
  correo: string
  numero_celular: string
  archivo_cedula?: string
  archivo_certificado?: string
}

export interface ApiResponse<T = unknown> {
  data: T
  message?: string
}

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
}
