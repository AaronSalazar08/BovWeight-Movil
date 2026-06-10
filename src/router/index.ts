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

      // Home Ganadero
      {
        path: 'home',
        name: 'HomeGanadero',
        component: () => import('@/views/home/HomeGanaderoPage.vue'),
        meta: { requiresAuth: true, roles: ['Ganadero', 'Administrador'] },
      },

      // Home Veterinario
      {
        path: 'home-vet',
        name: 'HomeVeterinario',
        component: () => import('@/views/home/HomeVeterinarioPage.vue'),
        meta: { requiresAuth: true, roles: ['Veterinario'] },
      },

      // Perfil (accesible por todos los roles)
      {
        path: 'perfil',
        name: 'Perfil',
        component: () => import('@/views/perfil/PerfilPage.vue'),
      },

      // Fincas del ganadero
      {
        path: 'fincas',
        name: 'Fincas',
        component: () => import('@/views/fincas/FincasPage.vue'),
        meta: { roles: ['Ganadero', 'Administrador'] },
      },

      // Fincas asignadas al veterinario
      {
        path: 'fincas-asignadas',
        name: 'FincasAsignadas',
        component: () => import('@/views/fincas/FincasPage.vue'),
        meta: { roles: ['Veterinario'] },
      },

      {
        path: 'fincas/:fincaId/animales',
        name: 'Animales',
        component: () => import('@/views/fincas/AnimalesPage.vue'),
      },

      {
        path: 'mi-ganado',
        name: 'MiGanado',
        component: () => import('@/views/ganado/MiGanadoPage.vue'),
      },

      {
        path: 'ganado/:animalId/detalle',
        name: 'DetalleGanado',
        component: () => import('@/views/ganado/DetalleGanadoPage.vue'),
      },

      {
        path: 'ganado/:animalId/historial',
        name: 'HistorialGanado',
        component: () => import('@/views/ganado/HistorialGanadoPage.vue'),
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

  // Redirigir a login si la ruta requiere autenticación
  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ name: 'Login' })
  }

  // Redirigir al home correcto si ya está autenticado y va a una ruta de guest
  if (to.meta.requiresGuest && isAuthenticated) {
    return next(getHomeRoute(authStore))
  }

  // Redirigir al home del rol correspondiente si va a /tabs/home genérico
  if (to.name === 'HomeGanadero' && authStore.isVeterinario) {
    return next({ name: 'HomeVeterinario' })
  }
  if (to.name === 'HomeVeterinario' && !authStore.isVeterinario) {
    return next({ name: 'HomeGanadero' })
  }

  next()
})

/** Devuelve la ruta de inicio correcta según el rol del usuario */
function getHomeRoute(authStore: ReturnType<typeof useAuthStore>) {
  if (authStore.isVeterinario) return { name: 'HomeVeterinario' }
  return { name: 'HomeGanadero' }
}

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
