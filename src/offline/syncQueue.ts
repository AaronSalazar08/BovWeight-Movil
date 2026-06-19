import { Preferences } from '@capacitor/preferences'
import type { SyncOperation, SyncStatus } from '@/types/sync'

const QUEUE_KEY = 'bov_sync_queue'

/**
 * Persistencia de la cola de sincronización offline.
 * Capacitor Preferences es key-value, así que la cola completa se lee/escribe
 * como un único JSON. El volumen esperado (decenas de operaciones pendientes
 * por dispositivo) hace esto aceptable; no se diseñó para miles de registros.
 */
async function readAll(): Promise<SyncOperation[]> {
  const { value } = await Preferences.get({ key: QUEUE_KEY })
  if (!value) return []
  try {
    return JSON.parse(value) as SyncOperation[]
  } catch {
    return []
  }
}

async function writeAll(operations: SyncOperation[]): Promise<void> {
  await Preferences.set({ key: QUEUE_KEY, value: JSON.stringify(operations) })
}

export const syncQueue = {
  async list(): Promise<SyncOperation[]> {
    return readAll()
  },

  /** Agrega una operación al final de la cola, preservando orden FIFO. */
  async enqueue(operation: SyncOperation): Promise<void> {
    const all = await readAll()
    all.push(operation)
    await writeAll(all)
  },

  async updateStatus(
    id: string,
    patch: Partial<Pick<SyncOperation, 'status' | 'retryCount' | 'lastError' | 'resultServerId'>>,
  ): Promise<void> {
    const all = await readAll()
    const idx = all.findIndex((op) => op.id === id)
    if (idx === -1) return
    Object.assign(all[idx], patch)
    await writeAll(all)
  },

  async findById(id: string): Promise<SyncOperation | undefined> {
    const all = await readAll()
    return all.find((op) => op.id === id)
  },

  async remove(id: string): Promise<void> {
    const all = await readAll()
    await writeAll(all.filter((op) => op.id !== id))
  },

  /**
   * Elimina operaciones 'synced' que ya no son referenciadas como dependencia
   * por ninguna operación pendiente. Evita que la cola crezca indefinidamente
   * sin perder el resultServerId que otra operación todavía necesita resolver.
   */
  async prune(): Promise<void> {
    const all = await readAll()
    const referencedIds = new Set(
      all.filter((op) => op.status !== 'synced' && op.dependsOn).map((op) => op.dependsOn),
    )
    const kept = all.filter((op) => op.status !== 'synced' || referencedIds.has(op.id))
    if (kept.length !== all.length) await writeAll(kept)
  },

  async clear(): Promise<void> {
    await Preferences.remove({ key: QUEUE_KEY })
  },
}

export function countByStatus(operations: SyncOperation[], status: SyncStatus): number {
  return operations.filter((op) => op.status === status).length
}
