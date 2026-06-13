<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/tabs/ganado/${animalId}/detalle`" />
        </ion-buttons>
        <ion-title>Historial de Pesajes</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="historial-content">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <!-- Loading -->
      <div v-if="loading" class="center-state">
        <ion-spinner name="crescent" color="primary" />
        <p>Cargando historial...</p>
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
        <!-- Animal info card -->
        <div class="animal-card">
          <div class="animal-avatar">
            <ion-icon :icon="pawOutline" class="avatar-icon" />
          </div>
          <div class="animal-info">
            <h2 class="animal-nombre">{{ animal?.nombre ?? '—' }}</h2>
            <p class="animal-arete">Arete: <strong>{{ animal?.arete ?? '—' }}</strong></p>
            <p class="animal-raza">{{ animal?.raza }} · {{ animal?.sexo }}</p>
          </div>
          <div class="registros-badge">
            <span class="badge-num">{{ historial.length }}</span>
            <span class="badge-lbl">pesajes</span>
          </div>
        </div>

        <!-- Búsqueda por arete -->
        <div class="search-section">
          <ion-searchbar
            v-model="busqueda"
            placeholder="Arete del animal..."
            show-clear-button="focus"
            class="arete-search"
          />
        </div>

        <!-- Sin registros -->
        <div v-if="!historial.length" class="center-state no-records">
          <ion-icon :icon="scaleOutline" class="state-icon" />
          <p>Sin registros de pesaje</p>
          <p class="no-records-sub">Los pesajes realizados con IA aparecerán aquí</p>
        </div>

        <template v-else>
          <!-- Evolución de peso -->
          <div v-if="chartData.length > 1">
            <div class="section-title">
              <h3>Evolución de Peso</h3>
            </div>
            <div class="chart-card">
              <svg :viewBox="`0 0 ${LINE_W} ${LINE_H}`" class="line-svg">
                <!-- Grid lines + Y labels -->
                <g v-for="tick in lineTicks" :key="'g' + tick">
                  <line
                    :x1="LINE_PL" :y1="lineY(tick)"
                    :x2="LINE_W - LINE_PR" :y2="lineY(tick)"
                    stroke="#eef1f4" stroke-width="1"
                  />
                  <text
                    :x="LINE_PL - 4" :y="lineY(tick) + 4"
                    text-anchor="end" font-size="10" fill="#bbb"
                  >{{ tick }}</text>
                </g>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#2d8a4e" stop-opacity="0.35" />
                    <stop offset="100%" stop-color="#2d8a4e" stop-opacity="0" />
                  </linearGradient>
                </defs>
                <!-- Area fill -->
                <polygon :points="polygonPoints" fill="url(#areaGrad)" />
                <!-- Polyline -->
                <polyline
                  :points="polylinePoints"
                  fill="none" stroke="#2d8a4e" stroke-width="2.5"
                  stroke-linecap="round" stroke-linejoin="round"
                />
                <!-- Data points -->
                <circle
                  v-for="(p, i) in chartPoints" :key="i"
                  :cx="p.x" :cy="p.y" r="4"
                  fill="#fff" stroke="#2d8a4e" stroke-width="2"
                />
                <!-- X labels (first, last, and sparse middle) -->
                <text
                  v-for="(p, i) in sparseLabels" :key="'xl' + i"
                  :x="p.x" :y="LINE_H - LINE_PB + 14"
                  text-anchor="middle" font-size="9" fill="#999"
                >{{ p.label }}</text>
              </svg>
              <div class="chart-footer">
                <span class="chart-min">Mín: {{ chartMin.toFixed(1) }} kg</span>
                <span class="chart-max">Máx: {{ chartMax.toFixed(1) }} kg</span>
              </div>
            </div>
          </div>

          <!-- Lista de registros -->
          <div class="section-title">
            <h3>Registros ({{ historial.length }})</h3>
          </div>
          <div class="records-list">
            <div
              v-for="reg in historial"
              :key="reg.id"
              class="record-item"
            >
              <div class="record-left">
                <p class="record-fecha">{{ formatFecha(reg.fecha) }}</p>
                <p class="record-hora">{{ formatHora(reg.created_at) }}</p>
              </div>
              <div class="record-center">
                <p class="record-peso">{{ pesoEfectivo(reg) }}<span class="kg-unit"> kg</span></p>
                <p v-if="reg.peso_corregido !== null" class="record-estimado">
                  Estimado: {{ reg.peso_estimado.toFixed(1) }} kg
                </p>
              </div>
            </div>
          </div>
        </template>

        <div style="height: 32px" />

      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton,
  IonButtons, IonButton, IonIcon, IonSpinner, IonSearchbar,
  IonRefresher, IonRefresherContent,
} from '@ionic/vue'
import { alertCircleOutline, pawOutline, scaleOutline } from 'ionicons/icons'
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getGanado, type Ganado } from '@/api/ganado'
import { getHistorialPeso, type RegistroPeso } from '@/api/reportes'

const LINE_W = 320
const LINE_H = 160
const LINE_PT = 18
const LINE_PB = 26
const LINE_PL = 38
const LINE_PR = 12
const LINE_IW = LINE_W - LINE_PL - LINE_PR
const LINE_IH = LINE_H - LINE_PT - LINE_PB

const route = useRoute()
const animalId = Number(route.params.animalId)

const animal = ref<Ganado | null>(null)
const historial = ref<RegistroPeso[]>([])
const busqueda = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

async function cargarDatos() {
  loading.value = true
  error.value = null
  try {
    const animalData = await getGanado(animalId)
    animal.value = animalData
    busqueda.value = animalData.arete

    const historialData = await getHistorialPeso(animalId)
    historial.value = historialData.map(r => ({
      ...r,
      peso_estimado: Number(r.peso_estimado),
      peso_corregido: r.peso_corregido !== null ? Number(r.peso_corregido) : null,
      confianza: r.confianza !== null ? Number(r.confianza) : null,
    }))
  } catch (e) {
    console.error(e)
    error.value = 'No se pudo cargar el historial. Verifica tu conexión.'
  } finally {
    loading.value = false
  }
}

onMounted(cargarDatos)

async function handleRefresh(event: CustomEvent) {
  await cargarDatos()
  ;(event.target as HTMLIonRefresherElement).complete()
}

const chartData = computed(() =>
  [...historial.value]
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .slice(-12)
)

const chartMin = computed(() =>
  Math.min(...chartData.value.map(r => pesoEfectivoNum(r)))
)
const chartMax = computed(() =>
  Math.max(...chartData.value.map(r => pesoEfectivoNum(r)))
)

const yMin = computed(() => chartMin.value * 0.96)
const yMax = computed(() => chartMax.value * 1.04)

const lineTicks = computed(() => {
  const range = yMax.value - yMin.value
  const step = range <= 0 ? 10 : Math.ceil(range / 3 / 5) * 5 || 5
  const start = Math.floor(yMin.value / step) * step
  const ticks: number[] = []
  for (let t = start; t <= yMax.value + step; t += step) ticks.push(t)
  return ticks
})

function lineY(peso: number): number {
  const range = yMax.value - yMin.value || 1
  return LINE_PT + LINE_IH - ((peso - yMin.value) / range) * LINE_IH
}

function lineX(i: number): number {
  const count = chartData.value.length
  return LINE_PL + (i / (count - 1 || 1)) * LINE_IW
}

const chartPoints = computed(() =>
  chartData.value.map((r, i) => ({
    x: lineX(i),
    y: lineY(pesoEfectivoNum(r)),
  }))
)

const polylinePoints = computed(() =>
  chartPoints.value.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
)

const polygonPoints = computed(() => {
  const pts = chartPoints.value
  if (!pts.length) return ''
  const baseline = LINE_PT + LINE_IH
  return [
    `${pts[0].x.toFixed(1)},${baseline}`,
    ...pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`),
    `${pts[pts.length - 1].x.toFixed(1)},${baseline}`,
  ].join(' ')
})

const sparseLabels = computed(() => {
  const pts = chartPoints.value
  const data = chartData.value
  if (!pts.length) return []
  const maxLabels = 4
  const step = Math.max(1, Math.floor(pts.length / maxLabels))
  return pts
    .map((p, i) => ({ x: p.x, label: formatDateShort(data[i].fecha) }))
    .filter((_, i) => i === 0 || i === pts.length - 1 || i % step === 0)
})

function pesoEfectivoNum(r: RegistroPeso): number {
  return r.peso_corregido ?? r.peso_estimado
}

function pesoEfectivo(r: RegistroPeso): string {
  return pesoEfectivoNum(r).toFixed(1)
}

const CR_TZ = 'America/Costa_Rica'

function parseFechaLocal(fecha: string): Date {
  const [y, m, d] = fecha.substring(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatFecha(fecha: string): string {
  return parseFechaLocal(fecha).toLocaleDateString('es-CR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function formatDateShort(fecha: string): string {
  return parseFechaLocal(fecha).toLocaleDateString('es-CR', {
    day: '2-digit', month: 'short',
  })
}

function formatHora(createdAt: string): string {
  return new Date(createdAt).toLocaleTimeString('es-CR', {
    hour: '2-digit', minute: '2-digit',
    timeZone: CR_TZ,
  })
}

</script>

<style scoped>
.historial-content { --background: #f0f4f8; }

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
.center-state.no-records { padding: 40px 24px; }
.state-icon { font-size: 42px; color: #ccc; }
.state-icon.error { color: #e53935; }
.no-records-sub { font-size: 12px; color: #bbb; margin: 0; }

/* Animal card */
.animal-card {
  margin: 16px 16px 0;
  background: linear-gradient(135deg, #1a5c2a, #2d8a4e);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  color: #fff;
}
.animal-avatar { flex-shrink: 0; }
.avatar-icon { font-size: 44px; color: rgba(255, 255, 255, 0.85); }
.animal-info { flex: 1; min-width: 0; }
.animal-nombre {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.animal-arete { font-size: 12px; margin: 0 0 2px; color: rgba(255, 255, 255, 0.85); }
.animal-raza { font-size: 11px; margin: 0; color: rgba(255, 255, 255, 0.7); }

.registros-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 8px 12px;
  flex-shrink: 0;
}
.badge-num { font-size: 22px; font-weight: 700; line-height: 1; }
.badge-lbl { font-size: 10px; color: rgba(255, 255, 255, 0.75); }

/* Search */
.search-section { padding: 12px 8px 4px; }
.arete-search { --background: #fff; --border-radius: 12px; }

/* Section title */
.section-title { padding: 20px 16px 8px; }
.section-title h3 { font-size: 15px; font-weight: 600; color: #333; margin: 0; }

/* Line chart */
.chart-card {
  margin: 0 16px;
  background: #fff;
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.line-svg { display: block; width: 100%; height: 160px; }
.chart-footer {
  display: flex;
  justify-content: space-between;
  padding-top: 8px;
  font-size: 11px;
  color: #aaa;
}

/* Records list */
.records-list { padding: 0 8px; }
.record-item {
  margin-bottom: 8px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.record-left { min-width: 76px; }
.record-fecha { font-size: 12px; font-weight: 600; color: #333; margin: 0; }
.record-hora { font-size: 10px; color: #bbb; margin: 2px 0 0; }

.record-center { flex: 1; min-width: 0; }
.record-peso { font-size: 18px; font-weight: 700; color: #1a5c2a; margin: 0; }
.kg-unit { font-size: 13px; font-weight: 400; color: #999; }
.record-estimado { font-size: 11px; color: #aaa; margin: 2px 0 0; }

</style>
