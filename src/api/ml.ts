import axios from 'axios'

export interface MLMedidas {
  perimetro_toracico_cm: number
  largo_cuerpo_cm: number
  altura_cm: number
}

export interface MLEstimacion {
  peso_estimado_kg: number
  rango_min_kg: number
  rango_max_kg: number
  confianza: number
  metodo?: string
  advertencia?: string
  requiere_referencia?: boolean
  medidas?: MLMedidas
  imagen_anotada?: string
  deteccion?: { bbox: number[]; score: number }
}

export const estimarPesoDesdeImagen = async (
  imageBase64: string,
  breed: string = 'default',
): Promise<MLEstimacion> => {
  const mlUrl = import.meta.env.VITE_ML_SERVICE_URL ?? 'http://localhost:5000'

  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')
  const byteString = atob(base64Data)
  const byteArray = new Uint8Array(byteString.length)
  for (let i = 0; i < byteString.length; i++) {
    byteArray[i] = byteString.charCodeAt(i)
  }
  const blob = new Blob([byteArray], { type: 'image/jpeg' })

  const formData = new FormData()
  formData.append('image', blob, 'animal.jpg')
  formData.append('breed', breed)

  const response = await axios.post(`${mlUrl}/api/estimate`, formData)
  return response.data
}
