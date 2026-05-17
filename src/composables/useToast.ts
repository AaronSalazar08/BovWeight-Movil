import { toastController } from '@ionic/vue'

export function useToast() {
  async function showToast(
    message: string,
    color: 'success' | 'danger' | 'warning' | 'medium' = 'medium',
    duration = 3000,
  ) {
    const toast = await toastController.create({
      message,
      duration,
      color,
      position: 'top',
      buttons: [{ icon: 'close', role: 'cancel' }],
    })
    await toast.present()
  }

  const success = (message: string) => showToast(message, 'success')
  const error = (message: string) => showToast(message, 'danger')
  const warning = (message: string) => showToast(message, 'warning')
  const info = (message: string) => showToast(message, 'medium')

  return { showToast, success, error, warning, info }
}
