import { ref, computed, watch } from 'vue'
import { useNetworkStatus } from './useNetworkStatus'
import { syncQueue } from '@/offline/syncQueue'
import { processQueue } from '@/offline/syncProcessor'
import type { SyncOperation, SyncOperationType } from '@/types/sync'

function generateId(): string {
  if ('randomUUID' in crypto) return crypto.randomUUID()
  // Fallback para WebViews antiguos sin crypto.randomUUID.
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const operations = ref<SyncOperation[]>([])
const isSyncing = ref(false)
let refreshed = false

async function refresh() {
  try {
    operations.value = await syncQueue.list()
  } catch (e) {
    console.error('[offline-sync] No se pudo leer la cola local:', e)
  }
}

async function sync() {
  if (isSyncing.value) return
  isSyncing.value = true
  try {
    await processQueue()
  } catch (e) {
    console.error('[offline-sync] Falló el procesamiento de la cola:', e)
  } finally {
    await refresh()
    isSyncing.value = false
  }
}

/**
 * Composable público de offline-sync. Estado compartido a nivel de módulo:
 * todas las pantallas ven la misma cola y el mismo contador de pendientes.
 */
export function useOfflineSync() {
  const { isOnline } = useNetworkStatus()

  if (!refreshed) {
    refreshed = true
    refresh()
  }

  watch(isOnline, (online, wasOnline) => {
    if (online && !wasOnline) sync()
  })

  const pending = computed(() => operations.value.filter((op) => op.status === 'pending' || op.status === 'syncing'))
  const conflicts = computed(() => operations.value.filter((op) => op.status === 'conflict'))
  const failed = computed(() => operations.value.filter((op) => op.status === 'failed'))

  /**
   * Encola una operación y, si hay red, intenta sincronizar de inmediato.
   * Devuelve el id de la operación (útil para encadenar dependsOn).
   */
  async function enqueue<T extends SyncOperationType>(
    type: T,
    payload: Extract<SyncOperation, { type: T }>['payload'],
    dependsOn?: string,
  ): Promise<string> {
    const id = generateId()
    await syncQueue.enqueue({
      id,
      type,
      payload,
      dependsOn,
      status: 'pending',
      retryCount: 0,
      createdAt: new Date().toISOString(),
    } as SyncOperation)
    await refresh()
    if (isOnline.value) sync()
    return id
  }

  async function resolveConflict(id: string, action: 'discard') {
    if (action === 'discard') await syncQueue.remove(id)
    await refresh()
  }

  async function retryFailed(id: string) {
    await syncQueue.updateStatus(id, { status: 'pending', retryCount: 0 })
    await refresh()
    if (isOnline.value) sync()
  }

  return { isOnline, isSyncing, pending, conflicts, failed, enqueue, sync, resolveConflict, retryFailed }
}
