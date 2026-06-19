import { ref, onMounted, onUnmounted } from 'vue'
import { Network, type ConnectionStatus } from '@capacitor/network'
import type { PluginListenerHandle } from '@capacitor/core'

const isOnline = ref(true)
let listenersAttached = 0
let listenerHandle: PluginListenerHandle | null = null

async function syncStatus() {
  const status = await Network.getStatus()
  isOnline.value = status.connected
}

/**
 * Composable compartido (estado a nivel de módulo) para no registrar un
 * listener de @capacitor/network por cada componente que lo use.
 */
export function useNetworkStatus() {
  onMounted(async () => {
    listenersAttached++
    if (listenersAttached === 1) {
      await syncStatus()
      listenerHandle = await Network.addListener('networkStatusChange', (status: ConnectionStatus) => {
        isOnline.value = status.connected
      })
    }
  })

  onUnmounted(() => {
    listenersAttached--
    if (listenersAttached === 0 && listenerHandle) {
      listenerHandle.remove()
      listenerHandle = null
    }
  })

  return { isOnline }
}
