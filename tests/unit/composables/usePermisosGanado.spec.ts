import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { useAuthStore } from '@/stores/auth'
import { usePermisosGanado } from '@/composables/usePermisosGanado'
import type { User } from '@/types'

function setUsuario(tipo: User['tipo']) {
  const auth = useAuthStore()
  auth.user = {
    id: 1,
    nombre: 'Usuario de prueba',
    correo: 'prueba@bovweight.cr',
    tipo,
    creado_en: '2026-01-01',
  }
}

describe('usePermisosGanado', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  test('el ganadero puede agregar y editar completo, no puede editar estado de salud', () => {
    setUsuario('Ganadero')
    const permisos = usePermisosGanado()

    expect(permisos.puedeAgregarGanado.value).toBe(true)
    expect(permisos.puedeEditarCompleto.value).toBe(true)
    expect(permisos.puedeEditarEstadoSalud.value).toBe(false)
    expect(permisos.campoEstadoPrincipal.value).toBe('estado_comercial')
  })

  test('el veterinario no puede agregar ni editar completo, solo editar estado de salud', () => {
    setUsuario('Veterinario')
    const permisos = usePermisosGanado()

    expect(permisos.puedeAgregarGanado.value).toBe(false)
    expect(permisos.puedeEditarCompleto.value).toBe(false)
    expect(permisos.puedeEditarEstadoSalud.value).toBe(true)
    expect(permisos.campoEstadoPrincipal.value).toBe('estado_salud')
  })
})
