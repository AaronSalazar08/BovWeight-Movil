<script setup lang="ts">
import { computed } from 'vue'
import { alertController } from '@ionic/vue'
import { useOfflineSync } from '@/composables/useOfflineSync'

const { isOnline, isSyncing, pending, conflicts, failed, sync, resolveConflict, retryFailed } = useOfflineSync()

const visible = computed(() => !isOnline.value || pending.value.length > 0 || conflicts.value.length > 0 || failed.value.length > 0)

const label = computed(() => {
  if (!isOnline.value) return `Sin conexión · ${pending.value.length} pendiente(s) por sincronizar`
  if (isSyncing.value) return 'Sincronizando datos...'
  if (conflicts.value.length > 0) return `${conflicts.value.length} registro(s) con conflicto`
  if (failed.value.length > 0) return `${failed.value.length} registro(s) no se pudieron sincronizar`
  return `${pending.value.length} pendiente(s) por sincronizar`
})

const color = computed(() => {
  if (conflicts.value.length > 0 || failed.value.length > 0) return 'danger'
  if (!isOnline.value) return 'medium'
  return 'warning'
})

const labelFor: Record<string, string> = {
  'ganado.create': 'Registro de animal',
  'ganado.update': 'Edición de animal',
  'finca.create': 'Registro de finca',
  'peso.registrar': 'Registro de peso',
  'ml.estimar': 'Estimación de peso por foto',
}

async function abrirDetalle() {
  const items = [...conflicts.value, ...failed.value]
  if (items.length === 0) {
    if (isOnline.value) sync()
    return
  }

  const alert = await alertController.create({
    header: 'Pendientes con problema',
    message: items
      .map((op) => `• ${labelFor[op.type] ?? op.type}: ${op.lastError ?? 'Error desconocido'}`)
      .join('<br>'),
    buttons: [
      {
        text: 'Descartar todos',
        role: 'destructive',
        handler: () => {
          items.forEach((op) => resolveConflict(op.id, 'discard'))
        },
      },
      {
        text: 'Reintentar fallidos',
        handler: () => {
          failed.value.forEach((op) => retryFailed(op.id))
        },
      },
      { text: 'Cerrar', role: 'cancel' },
    ],
  })
  await alert.present()
}
</script>

<template>
  <div v-if="visible" class="sync-banner" :class="`sync-banner--${color}`" @click="abrirDetalle">
    {{ label }}
  </div>
</template>

<style scoped>
.sync-banner {
  position: fixed;
  top: env(safe-area-inset-top, 0);
  left: 0;
  right: 0;
  z-index: 9999;
  font-size: 0.8rem;
  text-align: center;
  padding: 6px 12px;
  color: white;
  cursor: pointer;
}
.sync-banner--warning { background: var(--ion-color-warning); color: #1f1f1f; }
.sync-banner--danger { background: var(--ion-color-danger); }
.sync-banner--medium { background: var(--ion-color-medium); }
</style>
