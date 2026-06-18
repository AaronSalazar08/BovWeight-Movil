import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

export function usePermisosGanado() {
  const auth = useAuthStore()
  const esVeterinario = computed(() => auth.isVeterinario)

  const puedeAgregarGanado = computed(() => !esVeterinario.value)
  const puedeEditarCompleto = computed(() => !esVeterinario.value)
  const puedeEditarEstadoSalud = computed(() => esVeterinario.value)
  const campoEstadoPrincipal = computed<'estado_salud' | 'estado_comercial'>(() =>
    esVeterinario.value ? 'estado_salud' : 'estado_comercial',
  )

  return {
    puedeAgregarGanado,
    puedeEditarCompleto,
    puedeEditarEstadoSalud,
    campoEstadoPrincipal,
  }
}
