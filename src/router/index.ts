import { createRouter, createWebHistory } from '@ionic/vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/tabs/home',
  },

  // ── Rutas de autenticación (solo usuarios NO autenticados) ─────────────────
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginPage.vue'),
    meta: { requiresGuest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/auth/RegisterPage.vue'),
    meta: { requiresGuest: true },
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/views/auth/ForgotPasswordPage.vue'),
    meta: { requiresGuest: true },
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('@/views/auth/ResetPasswordPage.vue'),
    meta: { requiresGuest: true },
  },

  // ── Rutas protegidas (dentro de tabs) ─────────────────────────────────────
  {
    path: '/tabs',
    component: () => import('@/views/tabs/TabsPage.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/tabs/home',
      },
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/home/HomePage.vue'),
      },
      {
        path: 'perfil',
        name: 'Perfil',
        component: () => import('@/views/perfil/PerfilPage.vue'),
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  // Si tiene token pero no tiene usuario cargado, valida la sesión
  if (authStore.token && !authStore.user) {
    await authStore.fetchCurrentUser()
  }

  const isAuthenticated = authStore.isAuthenticated

  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ name: 'Login' })
  }

  if (to.meta.requiresGuest && isAuthenticated) {
    return next({ name: 'Home' })
  }

  next()
})

// Escucha eventos de sesión expirada desde el interceptor de axios
if (typeof window !== 'undefined') {
  window.addEventListener('auth:unauthorized', () => {
    const authStore = useAuthStore()
    authStore.logout().finally(() => {
      router.push({ name: 'Login' })
    })
  })
}

export default router
