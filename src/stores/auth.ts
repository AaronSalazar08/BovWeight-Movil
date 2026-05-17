import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, LoginCredentials } from '@/types'
import { authApi } from '@/api/auth'
import { tokenStorage } from '@/api/client'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(tokenStorage.get())
  const isLoading = ref(false)

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.tipo === 'Administrador')
  const userDisplayName = computed(() => user.value?.nombre ?? '')

  async function login(credentials: LoginCredentials) {
    isLoading.value = true
    try {
      const { data } = await authApi.login(credentials)
      token.value = data.token
      user.value = data.usuario
      tokenStorage.set(data.token)
    } finally {
      isLoading.value = false
    }
  }

  async function logout() {
    try {
      await authApi.logout()
    } finally {
      token.value = null
      user.value = null
      tokenStorage.remove()
    }
  }

  async function fetchCurrentUser(): Promise<boolean> {
    if (!token.value) return false
    try {
      const { data } = await authApi.me()
      user.value = data
      return true
    } catch {
      token.value = null
      user.value = null
      tokenStorage.remove()
      return false
    }
  }

  return {
    user,
    token,
    isLoading,
    isAuthenticated,
    isAdmin,
    userDisplayName,
    login,
    logout,
    fetchCurrentUser,
  }
})
