import type { CreateGanadoPayload } from '@/api/ganado'
import type { Finca } from '@/api/fincas'

export type SyncOperationType =
  | 'ganado.create'
  | 'ganado.update'
  | 'finca.create'
  | 'peso.registrar'
  | 'ml.estimar'

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed'

interface BaseOperation {
  /** UUID generado en el cliente (crypto.randomUUID). Identifica la operación en la cola, no el recurso remoto. */
  id: string
  status: SyncStatus
  retryCount: number
  createdAt: string
  lastError?: string
  /** id de otra operación de la cola cuyo resultServerId se necesita para completar el payload. */
  dependsOn?: string
  /** id real asignado por el backend una vez sincronizada con éxito. */
  resultServerId?: number
}

export interface GanadoCreateOperation extends BaseOperation {
  type: 'ganado.create'
  payload: CreateGanadoPayload
}

export interface GanadoUpdateOperation extends BaseOperation {
  type: 'ganado.update'
  payload: { ganadoId: number; data: Partial<CreateGanadoPayload> }
}

export interface FincaCreateOperation extends BaseOperation {
  type: 'finca.create'
  payload: Partial<Finca>
}

export interface PesoRegistrarOperation extends BaseOperation {
  type: 'peso.registrar'
  /** ganadoId es null cuando depende de un ganado.create offline aún no sincronizado. */
  payload: { ganadoId: number | null; peso: number }
}

export interface MlEstimarOperation extends BaseOperation {
  type: 'ml.estimar'
  payload: {
    ganadoId: number | null
    /** Ruta de archivo en Filesystem (Directory.Data), no la imagen en sí. */
    fotoPath: string
    breed: string
  }
}

export type SyncOperation =
  | GanadoCreateOperation
  | GanadoUpdateOperation
  | FincaCreateOperation
  | PesoRegistrarOperation
  | MlEstimarOperation
