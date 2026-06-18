import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MLEstimacion } from '@/api/ml'

export const useEstimacionPendienteStore = defineStore('estimacionPendiente', () => {
  const foto = ref<string | null>(null)
  const fotoAnotada = ref<string | null>(null)
  const raza = ref('')
  const pesoKg = ref<number | null>(null)
  const resultadoML = ref<MLEstimacion | null>(null)

  const hayPendiente = computed(() => foto.value !== null)

  function setEstimacion(data: {
    foto: string
    fotoAnotada: string | null
    raza: string
    pesoKg: number | null
    resultadoML: MLEstimacion | null
  }) {
    foto.value = data.foto
    fotoAnotada.value = data.fotoAnotada
    raza.value = data.raza
    pesoKg.value = data.pesoKg
    resultadoML.value = data.resultadoML
  }

  function clear() {
    foto.value = null
    fotoAnotada.value = null
    raza.value = ''
    pesoKg.value = null
    resultadoML.value = null
  }

  return { foto, fotoAnotada, raza, pesoKg, resultadoML, hayPendiente, setEstimacion, clear }
})
