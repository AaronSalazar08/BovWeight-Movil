import axios from 'axios'
import { Filesystem } from '@capacitor/filesystem'
import { syncQueue } from './syncQueue'
import { createGanado, updateGanado, registrarPeso } from '@/api/ganado'
import { createFinca } from '@/api/fincas'
import { estimarPesoDesdeImagen } from '@/api/ml'
import type { SyncOperation } from '@/types/sync'

const MAX_RETRIES = 5

/**
 * Resultado de procesar una operación individual. 'blocked' significa que
 * depende de otra operación que todavía no se sincronizó: se reintentará en
 * la siguiente pasada de la cola, no cuenta como fallo.
 */
type OutcomeStatus = 'synced' | 'conflict' | 'failed' | 'retry' | 'blocked'

function isConflict(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 409
}

function isValidationError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 422
}

function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response
}

function extractMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? error.message
  }
  return error instanceof Error ? error.message : 'Error desconocido al sincronizar.'
}

/** Resuelve el id real del backend para una operación dependiente, si ya sincronizó. */
async function resolveDependency(op: SyncOperation): Promise<{ ready: boolean; serverId?: number }> {
  if (!op.dependsOn) return { ready: true }

  const parent = await syncQueue.findById(op.dependsOn)
  if (!parent) return { ready: true } // dependencia ya no existe (podada tras sync); no bloquear

  if (parent.status === 'synced' && parent.resultServerId != null) {
    return { ready: true, serverId: parent.resultServerId }
  }
  if (parent.status === 'conflict' || parent.status === 'failed') {
    return { ready: false } // no se podrá resolver: la operación hija se marcará 'failed'
  }
  return { ready: false, serverId: undefined } // padre aún pendiente: esperar
}

async function runOperation(op: SyncOperation): Promise<{ outcome: OutcomeStatus; serverId?: number; error?: string }> {
  const dep = op.dependsOn ? await resolveDependency(op) : { ready: true, serverId: undefined }

  if (op.dependsOn && !dep.ready) {
    const parent = await syncQueue.findById(op.dependsOn)
    if (parent && (parent.status === 'conflict' || parent.status === 'failed')) {
      return { outcome: 'failed', error: 'La operación de la que depende no se pudo sincronizar.' }
    }
    return { outcome: 'blocked' }
  }

  try {
    switch (op.type) {
      case 'ganado.create': {
        const creado = await createGanado(op.payload)
        return { outcome: 'synced', serverId: creado.id }
      }

      case 'ganado.update': {
        await updateGanado(op.payload.ganadoId, op.payload.data)
        return { outcome: 'synced' }
      }

      case 'finca.create': {
        // createFinca() devuelve { message, data: FincaResource } (ver api/fincas.ts).
        const creada = await createFinca(op.payload)
        return { outcome: 'synced', serverId: creada.data.id }
      }

      case 'peso.registrar': {
        const ganadoId = op.payload.ganadoId ?? dep.serverId
        if (ganadoId == null) return { outcome: 'failed', error: 'No se pudo resolver el animal asociado.' }
        await registrarPeso(ganadoId, op.payload.peso)
        return { outcome: 'synced' }
      }

      case 'ml.estimar': {
        const ganadoId = op.payload.ganadoId ?? dep.serverId
        if (ganadoId == null) return { outcome: 'failed', error: 'No se pudo resolver el animal asociado.' }

        const { data } = await Filesystem.readFile({ path: op.payload.fotoPath })
        const fotoBase64 = `data:image/jpeg;base64,${data}`

        const resultado = await estimarPesoDesdeImagen(fotoBase64, op.payload.breed)
        if (resultado.peso_estimado_kg > 0) {
          await registrarPeso(ganadoId, resultado.peso_estimado_kg)
        }
        await Filesystem.deleteFile({ path: op.payload.fotoPath }).catch(() => {})
        return { outcome: 'synced' }
      }
    }
  } catch (error) {
    if (isConflict(error)) return { outcome: 'conflict', error: extractMessage(error) }
    if (isValidationError(error)) return { outcome: 'failed', error: extractMessage(error) }
    if (isNetworkError(error)) return { outcome: 'retry', error: extractMessage(error) }
    return { outcome: 'failed', error: extractMessage(error) }
  }
}

let processing = false

/**
 * Procesa la cola en orden FIFO. Si una operación está bloqueada por una
 * dependencia no resuelta, se detiene esa rama pero continúa con las demás
 * operaciones independientes (no bloquea toda la cola).
 */
export async function processQueue(): Promise<void> {
  if (processing) return
  processing = true
  try {
    const pending = (await syncQueue.list()).filter((op) => op.status === 'pending')

    for (const op of pending) {
      await syncQueue.updateStatus(op.id, { status: 'syncing' })
      const result = await runOperation(op)

      if (result.outcome === 'synced') {
        await syncQueue.updateStatus(op.id, { status: 'synced', resultServerId: result.serverId, lastError: undefined })
      } else if (result.outcome === 'conflict') {
        await syncQueue.updateStatus(op.id, { status: 'conflict', lastError: result.error })
      } else if (result.outcome === 'blocked') {
        await syncQueue.updateStatus(op.id, { status: 'pending' })
      } else if (result.outcome === 'retry') {
        const retryCount = op.retryCount + 1
        await syncQueue.updateStatus(op.id, {
          status: retryCount >= MAX_RETRIES ? 'failed' : 'pending',
          retryCount,
          lastError: result.error,
        })
      } else {
        await syncQueue.updateStatus(op.id, { status: 'failed', lastError: result.error })
      }
    }

    await syncQueue.prune()
  } finally {
    processing = false
  }
}
