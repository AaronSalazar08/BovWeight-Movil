import axios from 'axios'

const TOKEN_KEY = 'bov_auth_token'

export const tokenStorage = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string): void => { localStorage.setItem(TOKEN_KEY, token) },
  remove: (): void => { localStorage.removeItem(TOKEN_KEY) },
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Endpoints que devuelven 401 sin que eso signifique "sesión expirada":
// /auth/login con credenciales incorrectas, o /auth/logout cuando el token
// ya era inválido (logout es best-effort y no debe re-disparar este flujo).
const AUTH_ENDPOINTS_SIN_CASCADA = ['/auth/login', '/auth/logout']

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string = error.config?.url ?? ''
    const esEndpointSinCascada = AUTH_ENDPOINTS_SIN_CASCADA.some((endpoint) => url.includes(endpoint))

    if (error.response?.status === 401 && !esEndpointSinCascada) {
      tokenStorage.remove()
      // El store o el router guard se encargan de redirigir
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    }
    return Promise.reject(error)
  },
)

export default apiClient
