<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/home" />
        </ion-buttons>
        <ion-title>Reportes y Estadísticas</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="reportes-content">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <!-- Loading -->
      <div v-if="loading" class="center-state">
        <ion-spinner name="crescent" color="primary" />
        <p>Cargando estadísticas...</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="center-state">
        <ion-icon :icon="alertCircleOutline" class="state-icon error" />
        <p>{{ error }}</p>
        <ion-button fill="outline" color="primary" size="small" @click="cargarDatos">
          Reintentar
        </ion-button>
      </div>

      <template v-else>
        <!-- Resumen General -->
        <div class="section-title">
          <h3>Resumen General</h3>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <ion-icon :icon="pawOutline" class="stat-icon" />
            <p class="stat-value">{{ totalAnimales }}</p>
            <p class="stat-label">Total Animales</p>
          </div>
          <div class="stat-card">
            <ion-icon :icon="scaleOutline" class="stat-icon" />
            <p class="stat-value">{{ pesoPromedio }}<span class="stat-unit"> kg</span></p>
            <p class="stat-label">Peso Promedio</p>
          </div>
          <div class="stat-card">
            <ion-icon :icon="businessOutline" class="stat-icon" />
            <p class="stat-value">{{ totalFincas }}</p>
            <p class="stat-label">Fincas Activas</p>
          </div>
          <div class="stat-card">
            <ion-icon :icon="leafOutline" class="stat-icon" />
            <p class="stat-value">{{ totalRazas }}</p>
            <p class="stat-label">Razas Distintas</p>
          </div>
        </div>

        <!-- Animales por Finca -->
        <div class="section-title">
          <h3>Animales por Finca</h3>
        </div>

        <div class="chart-card">
          <div v-if="!animalesPorFinca.length" class="no-data">Sin datos disponibles</div>
          <div v-else class="bar-scroll">
            <svg
              :viewBox="`0 0 ${barChartW} ${BAR_H}`"
              :style="{ minWidth: barChartW + 'px' }"
              class="bar-svg"
            >
              <!-- Grid lines + Y labels -->
              <g v-for="tick in yTicks" :key="'g' + tick">
                <line
                  :x1="BAR_PL" :y1="barY(tick)"
                  :x2="barChartW - BAR_PR" :y2="barY(tick)"
                  stroke="#eef1f4" stroke-width="1"
                />
                <text
                  :x="BAR_PL - 4" :y="barY(tick) + 4"
                  text-anchor="end" font-size="10" fill="#bbb"
                >{{ tick }}</text>
              </g>
              <!-- Baseline -->
              <line
                :x1="BAR_PL" :y1="BAR_PT + BAR_IH"
                :x2="barChartW - BAR_PR" :y2="BAR_PT + BAR_IH"
                stroke="#d0d8df" stroke-width="1"
              />
              <!-- Bars -->
              <g v-for="(item, i) in animalesPorFinca" :key="item.nombre">
                <rect
                  :x="BAR_PL + i * barSlotW + barSlotW * 0.15"
                  :y="barY(item.count)"
                  :width="barSlotW * 0.7"
                  :height="(item.count / maxFincaCount) * BAR_IH"
                  fill="#2d8a4e" rx="4"
                />
                <text
                  :x="BAR_PL + i * barSlotW + barSlotW / 2"
                  :y="barY(item.count) - 5"
                  text-anchor="middle" font-size="11" fill="#1a5c2a" font-weight="600"
                >{{ item.count }}</text>
                <text
                  :x="BAR_PL + i * barSlotW + barSlotW / 2"
                  :y="BAR_H - BAR_PB + 14"
                  text-anchor="middle" font-size="10" fill="#777"
                >{{ trunc(item.nombre, 10) }}</text>
              </g>
            </svg>
          </div>
        </div>

        <!-- Distribución por Raza -->
        <div class="section-title">
          <h3>Distribución por Raza</h3>
        </div>

        <div class="chart-card">
          <div v-if="!razasDistrib.length" class="no-data">Sin datos disponibles</div>
          <div v-else class="pie-layout">
            <svg viewBox="0 0 200 200" class="pie-svg">
              <g transform="translate(100,100)">
                <path v-for="(s, i) in pieSlices" :key="i" :d="s.d" :fill="s.color" />
              </g>
            </svg>
            <div class="pie-legend">
              <div v-for="(item, i) in razasDistrib" :key="item.raza" class="legend-row">
                <span class="legend-dot" :style="{ background: PIE_COLORS[i % PIE_COLORS.length] }" />
                <span class="legend-lbl">{{ item.raza }}</span>
                <span class="legend-pct">{{ item.pct }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Estado Comercial -->
        <div class="section-title">
          <h3>Estado Comercial</h3>
        </div>

        <div class="estados-list">
          <div
            v-for="(est, i) in estadosComerciales"
            :key="est.nombre"
            class="estado-item"
          >
            <div class="estado-left">
              <span class="estado-dot" :style="{ background: ESTADO_COLORS[i % ESTADO_COLORS.length] }" />
              <span class="estado-nombre">{{ est.nombre }}</span>
            </div>
            <div class="estado-right">
              <div class="bar-bg">
                <div
                  class="bar-fill"
                  :style="{ width: est.pct + '%', background: ESTADO_COLORS[i % ESTADO_COLORS.length] }"
                />
              </div>
              <span class="estado-count">{{ est.count }}</span>
            </div>
          </div>
        </div>

        <div style="height: 32px" />
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton,
  IonButtons, IonButton, IonIcon, IonSpinner,
  IonRefresher, IonRefresherContent,
} from '@ionic/vue'
import {
  alertCircleOutline, pawOutline, businessOutline, leafOutline, scaleOutline,
} from 'ionicons/icons'
import { ref, computed, onMounted } from 'vue'
import { getTodoElGanado, type Ganado } from '@/api/ganado'

const BAR_H = 180
const BAR_PT = 22
const BAR_PB = 28
const BAR_PL = 32
const BAR_PR = 8
const BAR_IH = BAR_H - BAR_PT - BAR_PB
const BAR_SLOT_MIN = 72

const PIE_COLORS = ['#2d8a4e', '#1a5c2a', '#4caf7d', '#6fcf97', '#a8d8b9', '#c8e6d4', '#38c172', '#82c79e']
const ESTADO_COLORS = ['#2d8a4e', '#1a5c2a', '#4caf7d', '#6fcf97', '#82c79e']

const ganado = ref<Ganado[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

async function cargarDatos() {
  loading.value = true
  error.value = null
  try {
    ganado.value = await getTodoElGanado()
  } catch (e) {
    console.error(e)
    error.value = 'No se pudieron cargar los datos. Verifica tu conexión.'
  } finally {
    loading.value = false
  }
}

onMounted(cargarDatos)

async function handleRefresh(event: CustomEvent) {
  await cargarDatos()
  ;(event.target as HTMLIonRefresherElement).complete()
}

const totalAnimales = computed(() => ganado.value.length)

const pesoPromedio = computed(() => {
  const valid = ganado.value.filter(g => g.peso_kg && g.peso_kg > 0)
  if (!valid.length) return '—'
  return (valid.reduce((s, g) => s + (g.peso_kg ?? 0), 0) / valid.length).toFixed(1)
})

const totalFincas = computed(() => new Set(ganado.value.map(g => g.finca_id)).size)

const totalRazas = computed(() => new Set(ganado.value.map(g => g.raza)).size)

const animalesPorFinca = computed(() => {
  const map = new Map<string, number>()
  for (const g of ganado.value) {
    const nombre = g.finca?.nombre ?? `Finca ${g.finca_id}`
    map.set(nombre, (map.get(nombre) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([nombre, count]) => ({ nombre, count }))
    .sort((a, b) => b.count - a.count)
})

const maxFincaCount = computed(() =>
  Math.max(...animalesPorFinca.value.map(i => i.count), 1)
)

const barSlotW = computed(() =>
  Math.max(
    BAR_SLOT_MIN,
    animalesPorFinca.value.length
      ? (300 - BAR_PL - BAR_PR) / animalesPorFinca.value.length
      : BAR_SLOT_MIN,
  )
)

const barChartW = computed(() =>
  BAR_PL + animalesPorFinca.value.length * barSlotW.value + BAR_PR
)

const yTicks = computed(() => {
  const max = maxFincaCount.value
  if (max <= 4) return Array.from({ length: max + 1 }, (_, i) => i)
  const step = Math.ceil(max / 4)
  const ticks: number[] = []
  for (let t = 0; t <= max; t += step) ticks.push(t)
  return ticks
})

function barY(count: number): number {
  return BAR_PT + BAR_IH - (count / maxFincaCount.value) * BAR_IH
}

const razasDistrib = computed(() => {
  const map = new Map<string, number>()
  for (const g of ganado.value) map.set(g.raza, (map.get(g.raza) ?? 0) + 1)
  const total = ganado.value.length || 1
  return [...map.entries()]
    .map(([raza, count]) => ({ raza, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count)
})

const pieSlices = computed(() => {
  const total = ganado.value.length
  if (!total) return []
  const r = 90
  let angle = -Math.PI / 2
  return razasDistrib.value.map((item, i) => {
    const sweep = (item.count / total) * 2 * Math.PI
    const end = angle + sweep
    const d =
      item.count === total
        ? `M ${r} 0 A ${r} ${r} 0 1 1 ${r - 0.001} 0 Z`
        : `M 0 0 L ${(r * Math.cos(angle)).toFixed(3)} ${(r * Math.sin(angle)).toFixed(3)} A ${r} ${r} 0 ${sweep > Math.PI ? 1 : 0} 1 ${(r * Math.cos(end)).toFixed(3)} ${(r * Math.sin(end)).toFixed(3)} Z`
    angle = end
    return { d, color: PIE_COLORS[i % PIE_COLORS.length] }
  })
})

const estadosComerciales = computed(() => {
  const map = new Map<string, number>()
  for (const g of ganado.value) {
    const nombre = g.estado_comercial?.nombre ?? 'Sin estado'
    map.set(nombre, (map.get(nombre) ?? 0) + 1)
  }
  const total = ganado.value.length || 1
  return [...map.entries()]
    .map(([nombre, count]) => ({ nombre, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count)
})

function trunc(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}
</script>

<style scoped>
.reportes-content { --background: #f0f4f8; }

/* Center state */
.center-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  gap: 14px;
  color: #888;
  font-size: 14px;
  text-align: center;
}
.state-icon { font-size: 42px; }
.state-icon.error { color: #e53935; }

/* Section title */
.section-title { padding: 20px 16px 8px; }
.section-title h3 { font-size: 15px; font-weight: 600; color: #333; margin: 0; }

/* Stat cards */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 0 16px;
}
.stat-card {
  background: #fff;
  border-radius: 14px;
  padding: 18px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  text-align: center;
}
.stat-icon { font-size: 26px; color: #2d8a4e; }
.stat-value { font-size: 22px; font-weight: 700; color: #1a1a1a; margin: 0; line-height: 1.1; }
.stat-unit { font-size: 13px; font-weight: 400; color: #999; }
.stat-label { font-size: 11px; color: #888; margin: 0; }

/* Chart card */
.chart-card {
  margin: 0 16px;
  background: #fff;
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.no-data { text-align: center; color: #ccc; font-size: 13px; padding: 20px 0; }

/* Bar chart */
.bar-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.bar-svg { display: block; height: 180px; }

/* Pie chart */
.pie-layout {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
}
.pie-svg { width: 160px; height: 160px; flex-shrink: 0; }
.pie-legend { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.legend-row { display: flex; align-items: center; gap: 8px; }
.legend-dot { width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; }
.legend-lbl { flex: 1; font-size: 12px; color: #444; }
.legend-pct { font-size: 11px; color: #888; }

/* Estado comercial */
.estados-list { padding: 0 8px; }
.estado-item {
  margin-bottom: 8px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 13px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.estado-left { display: flex; align-items: center; gap: 10px; }
.estado-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.estado-nombre { font-size: 13px; font-weight: 500; color: #333; }
.estado-right { display: flex; align-items: center; gap: 10px; }
.bar-bg { width: 80px; height: 6px; background: #f0f4f8; border-radius: 3px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 3px; }
.estado-count { font-size: 13px; font-weight: 600; color: #2d8a4e; min-width: 20px; text-align: right; }
</style>
