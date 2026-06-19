<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>{{ t('common.appName') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="handleLogout">
            <ion-icon slot="icon-only" :icon="logOutOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="home-content">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <!-- Saludo -->
      <div class="welcome-section">
        <div class="welcome-card">
          <div class="welcome-avatar">
            <ion-icon :icon="medkitOutline" class="avatar-icon" />
          </div>
          <div class="welcome-text">
            <p class="greeting">{{ t('home.common.greeting') }}</p>
            <h2 class="user-name">{{ authStore.userDisplayName }}</h2>
            <ion-badge color="tertiary">{{ t('home.veterinario.roleBadge') }}</ion-badge>
          </div>
        </div>
      </div>

      <!-- Estadísticas -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon-wrap">
            <ion-icon :icon="businessOutline" class="stat-icon" />
          </div>
          <p class="stat-value">{{ totalFincas }}</p>
          <p class="stat-label">{{ t('home.veterinario.statFarmsAssigned') }}</p>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrap">
            <ion-icon :icon="pawOutline" class="stat-icon" />
          </div>
          <p class="stat-value">{{ totalAnimales }}</p>
          <p class="stat-label">{{ t('home.common.statAnimals') }}</p>
        </div>
      </div>

      <div class="weight-card">
        <div class="weight-header">
          <div class="stat-icon-wrap">
            <ion-icon :icon="scaleOutline" class="stat-icon" />
          </div>
          <p class="weight-label">{{ t('home.common.avgWeight') }}</p>
        </div>
        <p class="weight-value">{{ pesoPromedio }}<span class="weight-unit"> kg</span></p>
      </div>

      <!-- Acceso rápido -->
      <div class="section-title">
        <h3>{{ t('home.common.quickAccess') }}</h3>
      </div>

      <div class="quick-access">
        <button class="quick-card" type="button" @click="goToFincasAsignadas">
          <div class="quick-left">
            <div class="quick-icon-wrap">
              <ion-icon :icon="businessOutline" class="quick-icon" />
            </div>
            <div class="quick-text">
              <p class="quick-title">{{ t('home.veterinario.farmsAssigned') }}</p>
              <p class="quick-subtitle">{{ t('home.veterinario.viewFarms') }}</p>
            </div>
          </div>
          <ion-icon :icon="chevronForwardOutline" class="quick-chevron" />
        </button>

        <button class="quick-card" type="button" @click="goToGanado">
          <div class="quick-left">
            <div class="quick-icon-wrap">
              <ion-icon :icon="pawOutline" class="quick-icon" />
            </div>
            <div class="quick-text">
              <p class="quick-title">{{ t('home.veterinario.cattle') }}</p>
              <p class="quick-subtitle">{{ t('home.veterinario.viewCattle') }}</p>
            </div>
          </div>
          <ion-icon :icon="chevronForwardOutline" class="quick-chevron" />
        </button>

        <button class="quick-card" type="button" @click="goToHistorial">
          <div class="quick-left">
            <div class="quick-icon-wrap">
              <ion-icon :icon="barChartOutline" class="quick-icon" />
            </div>
            <div class="quick-text">
              <p class="quick-title">{{ t('home.veterinario.generalHistory') }}</p>
              <p class="quick-subtitle">{{ t('home.veterinario.viewHistory') }}</p>
            </div>
          </div>
          <ion-icon :icon="chevronForwardOutline" class="quick-chevron" />
        </button>
      </div>

      <!-- Actividad reciente -->
      <div class="section-title">
        <h3>{{ t('home.common.recentActivity') }}</h3>
      </div>

      <div class="activity-card">
        <div v-if="!recientes.length" class="activity-empty">
          {{ t('home.common.noWeighings') }}
        </div>
        <div v-else class="activity-row" v-for="reg in recientes" :key="reg.id">
          <img v-if="reg.ganado.imagen" :src="reg.ganado.imagen" class="activity-thumb" :alt="reg.ganado.nombre ?? reg.ganado.arete" />
          <div v-else class="activity-icon-wrap">
            <ion-icon :icon="scaleOutline" class="activity-icon" />
          </div>
          <div class="activity-info">
            <p class="activity-name">{{ reg.ganado.nombre ?? t('home.common.tagLabel', { tag: reg.ganado.arete }) }}</p>
            <p class="activity-date">{{ formatFecha(reg.fecha) }}</p>
          </div>
          <p class="activity-weight">{{ pesoEfectivo(reg) }} kg</p>
        </div>
      </div>

      <!-- Aviso legal -->
      <div class="legal-notice">
        <ion-icon :icon="informationCircleOutline" />
        <p>
          {{ t('common.legalNoticePrefix') }}
          <strong>{{ t('common.legalNoticeBold') }}</strong>
          {{ t('common.legalNoticeSuffix') }}
        </p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon, IonBadge,
  IonRefresher, IonRefresherContent,
  alertController,
} from '@ionic/vue'
import {
  logOutOutline, medkitOutline, businessOutline,
  pawOutline, barChartOutline, informationCircleOutline,
  scaleOutline, chevronForwardOutline,
} from 'ionicons/icons'
import { useAuthStore } from '@/stores/auth'
import { getTodoElGanado, type Ganado } from '@/api/ganado'
import { getFincas, type Finca } from '@/api/fincas'
import { getPesajesRecientes, type RegistroPesoConGanado } from '@/api/reportes'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()
const { t, locale } = useI18n()

const ganado = ref<Ganado[]>([])
const fincas = ref<Finca[]>([])
const recientes = ref<RegistroPesoConGanado[]>([])

async function cargarDatos() {
  try {
    const [g, f, r] = await Promise.all([
      getTodoElGanado(),
      getFincas(),
      getPesajesRecientes(5),
    ])
    ganado.value = g
    fincas.value = f
    recientes.value = r
  } catch (e: any) {
    console.error(e)
    toast.error(e?.response?.data?.message ?? t('common.loadErrorToast'))
  }
}

onMounted(cargarDatos)

const totalAnimales = computed(() => ganado.value.length)
const totalFincas = computed(() => fincas.value.length)

const pesoPromedio = computed(() => {
  const valid = ganado.value.filter(g => g.peso_kg && g.peso_kg > 0)
  if (!valid.length) return '—'
  return (valid.reduce((s, g) => s + (g.peso_kg ?? 0), 0) / valid.length).toFixed(1)
})

function pesoEfectivo(reg: RegistroPesoConGanado): string {
  return Number(reg.peso_corregido ?? reg.peso_estimado).toFixed(1)
}

function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.substring(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(locale.value === 'es-LA' ? 'es-CR' : 'en-US', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

async function handleLogout() {
  const alert = await alertController.create({
    header: t('common.logoutConfirmTitle'),
    message: t('common.logoutConfirmMessage'),
    buttons: [
      { text: t('common.cancel'), role: 'cancel' },
      {
        text: t('common.logout'),
        role: 'destructive',
        handler: async () => {
          await authStore.logout()
          router.replace({ name: 'Login' })
        },
      },
    ],
  })
  await alert.present()
}

async function handleRefresh(event: CustomEvent) {
  await Promise.all([authStore.fetchCurrentUser(), cargarDatos()])
  ;(event.target as HTMLIonRefresherElement).complete()
}

function goToFincasAsignadas() {
  router.push({ name: 'FincasAsignadas' })
}

function goToGanado() {
  router.push({ name: 'MiGanado' })
}

function goToHistorial() {
  router.push({ name: 'Reportes' })
}
</script>

<style scoped>
.home-content {
  --background: var(--ion-background-color);
}

.welcome-section {
  padding: 16px 16px 0;
}

.welcome-card {
  background: linear-gradient(135deg, #1a3a5c, #2d6a8a);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  color: #ffffff;
}

.welcome-avatar {
  flex-shrink: 0;
}

.avatar-icon {
  font-size: 52px;
  color: rgba(255, 255, 255, 0.9);
}

.welcome-text {
  flex: 1;
  min-width: 0;
}

.greeting {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
  margin: 0 0 2px;
}

.user-name {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.section-title {
  padding: 20px 16px 8px;
}

.section-title h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--bov-text-strong);
  margin: 0;
}

/* Estadísticas */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 16px 16px 0;
}

.stat-card {
  background: var(--bov-surface);
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 2px 8px var(--bov-shadow);
}

.stat-icon-wrap {
  display: inline-flex;
  background: rgba(82, 96, 255, 0.1);
  border-radius: 10px;
  padding: 8px;
  margin-bottom: 8px;
}

.stat-icon {
  font-size: 20px;
  color: var(--ion-color-tertiary, #5260ff);
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--bov-text-strong);
  margin: 0;
  line-height: 1.1;
}

.stat-label {
  font-size: 13px;
  color: var(--bov-text-muted);
  margin: 4px 0 0;
}

/* Peso promedio */
.weight-card {
  margin: 12px 16px 0;
  background: var(--bov-surface);
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 2px 8px var(--bov-shadow);
}

.weight-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.weight-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--bov-text-strong);
  margin: 0;
}

.weight-value {
  font-size: 30px;
  font-weight: 700;
  color: var(--bov-text-strong);
  margin: 0;
}

.weight-unit {
  font-size: 16px;
  font-weight: 400;
  color: var(--bov-text-muted);
}

/* Acceso rápido */
.quick-access {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 16px;
}

.quick-card {
  background: var(--bov-surface);
  border-radius: 14px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 8px var(--bov-shadow);
  cursor: pointer;
  border: none;
  width: 100%;
  transition: transform 0.15s ease;
}

.quick-card:active {
  transform: scale(0.98);
}

.quick-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.quick-icon-wrap {
  background: rgba(82, 96, 255, 0.1);
  border-radius: 10px;
  padding: 10px;
  display: flex;
}

.quick-icon {
  font-size: 22px;
  color: var(--ion-color-tertiary, #5260ff);
}

.quick-text {
  text-align: left;
}

.quick-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--bov-text-strong);
  margin: 0;
}

.quick-subtitle {
  font-size: 12px;
  color: var(--bov-text-muted);
  margin: 2px 0 0;
}

.quick-chevron {
  font-size: 18px;
  color: var(--bov-text-faint);
  flex-shrink: 0;
}

/* Actividad reciente */
.activity-card {
  margin: 0 16px;
  background: var(--bov-surface);
  border-radius: 14px;
  padding: 8px 16px;
  box-shadow: 0 2px 8px var(--bov-shadow);
}

.activity-empty {
  padding: 16px 0;
  text-align: center;
  font-size: 13px;
  color: var(--bov-text-muted);
}

.activity-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--bov-border);
}

.activity-row:last-child {
  border-bottom: none;
}

.activity-thumb {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
}

.activity-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: rgba(82, 96, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.activity-icon {
  font-size: 20px;
  color: var(--ion-color-tertiary, #5260ff);
}

.activity-info {
  flex: 1;
  min-width: 0;
}

.activity-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--bov-text-strong);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.activity-date {
  font-size: 11px;
  color: var(--bov-text-muted);
  margin: 2px 0 0;
}

.activity-weight {
  font-size: 14px;
  font-weight: 600;
  color: var(--bov-text-strong);
  margin: 0;
  flex-shrink: 0;
}

.legal-notice {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 20px 16px 32px;
  background: var(--bov-warning-soft-bg);
  border: 1px solid var(--bov-warning-soft-border);
  border-radius: 10px;
  padding: 12px 14px;
  color: var(--bov-warning-soft-text);
  font-size: 12px;
  line-height: 1.5;
}

.legal-notice ion-icon {
  font-size: 18px;
  flex-shrink: 0;
  margin-top: 1px;
  color: var(--bov-warning-soft-icon);
}

.legal-notice p {
  margin: 0;
}
</style>
