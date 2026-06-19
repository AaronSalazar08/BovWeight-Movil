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
            <ion-icon :icon="personCircleOutline" class="avatar-icon" />
          </div>
          <div class="welcome-text">
            <p class="greeting">{{ t('home.common.greeting') }}</p>
            <h2 class="user-name">{{ authStore.userDisplayName }}</h2>
            <ion-badge color="primary">{{ t('home.ganadero.roleBadge') }}</ion-badge>
          </div>
        </div>
      </div>

      <!-- Estadísticas -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon-wrap">
            <ion-icon :icon="pawOutline" class="stat-icon" />
          </div>
          <p class="stat-value">{{ totalAnimales }}</p>
          <p class="stat-label">{{ t('home.common.statAnimals') }}</p>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrap">
            <ion-icon :icon="businessOutline" class="stat-icon" />
          </div>
          <p class="stat-value">{{ totalFincas }}</p>
          <p class="stat-label">{{ t('home.ganadero.statFarms') }}</p>
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
        <button class="quick-card" type="button" @click="goToFincas">
          <div class="quick-left">
            <div class="quick-icon-wrap">
              <ion-icon :icon="businessOutline" class="quick-icon" />
            </div>
            <div class="quick-text">
              <p class="quick-title">{{ t('home.ganadero.myFarms') }}</p>
              <p class="quick-subtitle">{{ t('home.ganadero.manageFarms') }}</p>
            </div>
          </div>
          <ion-icon :icon="chevronForwardOutline" class="quick-chevron" />
        </button>

        <button class="quick-card" type="button" @click="goToMiGanado">
          <div class="quick-left">
            <div class="quick-icon-wrap">
              <ion-icon :icon="pawOutline" class="quick-icon" />
            </div>
            <div class="quick-text">
              <p class="quick-title">{{ t('home.ganadero.myCattle') }}</p>
              <p class="quick-subtitle">{{ t('home.ganadero.viewAnimals') }}</p>
            </div>
          </div>
          <ion-icon :icon="chevronForwardOutline" class="quick-chevron" />
        </button>

        <button class="quick-card" type="button" @click="abrirEstimador">
          <div class="quick-left">
            <div class="quick-icon-wrap">
              <ion-icon :icon="cameraOutline" class="quick-icon" />
            </div>
            <div class="quick-text">
              <p class="quick-title">{{ t('home.ganadero.estimateWeight') }}</p>
              <p class="quick-subtitle">{{ t('home.ganadero.estimateNow') }}</p>
            </div>
          </div>
          <ion-icon :icon="chevronForwardOutline" class="quick-chevron" />
        </button>

        <button class="quick-card" type="button" @click="goToReportes">
          <div class="quick-left">
            <div class="quick-icon-wrap">
              <ion-icon :icon="barChartOutline" class="quick-icon" />
            </div>
            <div class="quick-text">
              <p class="quick-title">{{ t('home.ganadero.reports') }}</p>
              <p class="quick-subtitle">{{ t('home.ganadero.viewStats') }}</p>
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

    <!-- MODAL ESTIMAR PESO -->
    <ion-modal :is-open="showEstimador" @did-dismiss="cerrarEstimador">
      <ion-header>
        <ion-toolbar>
          <ion-title>{{ t('home.ganadero.estimateWeight') }}</ion-title>
          <ion-buttons slot="end">
            <ion-button fill="clear" @click="cerrarEstimador">✕</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content class="ion-padding modal-content">
        <!-- FOTO -->
        <div class="form-group">
          <label class="form-label">{{ t('home.ganadero.photoLabel') }}</label>
          <div v-if="foto" class="foto-preview-container">
            <img :src="foto" class="foto-preview" :alt="t('home.ganadero.photoLabel')" />
            <ion-button fill="clear" size="small" class="foto-change-btn" @click="seleccionarFoto">
              <ion-icon :icon="cameraOutline" slot="start" />
              {{ t('home.ganadero.changePhoto') }}
            </ion-button>
          </div>
          <ion-button v-else expand="block" fill="outline" color="medium" @click="seleccionarFoto">
            <ion-icon :icon="cameraOutline" slot="start" />
            {{ t('home.ganadero.takePhotoOrUpload') }}
          </ion-button>
        </div>

        <!-- RAZA -->
        <div v-if="foto" class="form-group">
          <label class="form-label">{{ t('home.ganadero.breedLabel') }}</label>
          <ion-select v-model="raza" :placeholder="t('home.ganadero.selectBreed')" class="form-select" fill="outline">
            <ion-select-option v-for="r in RAZAS" :key="r" :value="r">{{ r }}</ion-select-option>
          </ion-select>
        </div>

        <!-- ESTIMAR -->
        <div v-if="foto" class="form-group">
          <ion-button
            expand="block"
            fill="outline"
            color="tertiary"
            :disabled="estimandoPeso"
            @click="estimarConIA"
          >
            <ion-spinner v-if="estimandoPeso" name="crescent" slot="start" />
            <ion-icon v-else :icon="sparklesOutline" slot="start" />
            {{ estimandoPeso ? t('home.ganadero.estimating') : t('home.ganadero.estimateWithAI') }}
          </ion-button>

          <div v-if="resultadoML" class="ml-resultado">
            <img v-if="fotoAnotada" :src="fotoAnotada" class="foto-anotada" :alt="t('home.ganadero.noAnimalDetected')" />

            <div class="ml-peso">{{ t('home.ganadero.estimatedWeight', { weight: resultadoML.peso_estimado_kg }) }}</div>
            <div class="ml-rango">{{ t('home.ganadero.rangeConfidence', { min: resultadoML.rango_min_kg, max: resultadoML.rango_max_kg, confidence: Math.round(resultadoML.confianza * 100) }) }}</div>

            <div v-if="resultadoML.medidas && resultadoML.medidas.perimetro_toracico_cm > 0" class="ml-medidas">
              <div class="ml-medida-item">
                <span class="ml-medida-label">{{ t('home.ganadero.chestGirth') }}</span>
                <span class="ml-medida-valor">{{ resultadoML.medidas.perimetro_toracico_cm }} cm</span>
              </div>
              <div class="ml-medida-item">
                <span class="ml-medida-label">{{ t('home.ganadero.bodyLength') }}</span>
                <span class="ml-medida-valor">{{ resultadoML.medidas.largo_cuerpo_cm }} cm</span>
              </div>
              <div class="ml-medida-item">
                <span class="ml-medida-label">{{ t('home.ganadero.height') }}</span>
                <span class="ml-medida-valor">{{ resultadoML.medidas.altura_cm }} cm</span>
              </div>
            </div>

            <div v-if="resultadoML.advertencia" class="ml-advertencia">{{ resultadoML.advertencia }}</div>
          </div>
        </div>

        <div v-if="resultadoML" class="modal-actions">
          <ion-button expand="block" fill="outline" @click="cerrarEstimador">
            {{ t('home.ganadero.estimateOnly') }}
          </ion-button>
          <ion-button expand="block" color="primary" @click="guardarComoAnimal">
            {{ t('home.ganadero.saveAsAnimal') }}
          </ion-button>
        </div>
      </ion-content>
    </ion-modal>
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
  IonModal, IonSelect, IonSelectOption, IonSpinner,
  alertController, actionSheetController,
} from '@ionic/vue'
import {
  logOutOutline, personCircleOutline, businessOutline,
  pawOutline, cameraOutline, barChartOutline, informationCircleOutline,
  imagesOutline, sparklesOutline, scaleOutline, chevronForwardOutline,
} from 'ionicons/icons'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { useAuthStore } from '@/stores/auth'
import { estimarPesoDesdeImagen, type MLEstimacion } from '@/api/ml'
import { useEstimacionPendienteStore } from '@/stores/estimacionPendiente'
import { getTodoElGanado, type Ganado } from '@/api/ganado'
import { getFincas, type Finca } from '@/api/fincas'
import { getPesajesRecientes, type RegistroPesoConGanado } from '@/api/reportes'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()
const estimacionPendienteStore = useEstimacionPendienteStore()
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

const RAZAS = ['Holstein', 'Angus', 'Jersey', 'Hereford', 'Brahman', 'Simmental', 'Cebuíno', 'Criollo']
const RAZA_TO_BREED: Record<string, string> = {
  Brahman: 'brahman',
  Cebuíno: 'cebu',
  Criollo: 'criollo',
}

const showEstimador = ref(false)
const foto = ref<string | null>(null)
const fotoAnotada = ref<string | null>(null)
const raza = ref('')
const estimandoPeso = ref(false)
const resultadoML = ref<MLEstimacion | null>(null)

function abrirEstimador() {
  foto.value = null
  fotoAnotada.value = null
  raza.value = ''
  resultadoML.value = null
  showEstimador.value = true
}

function cerrarEstimador() {
  showEstimador.value = false
}

async function tomarFotoDesde(source: CameraSource) {
  try {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Base64,
      source,
      quality: 80,
    })
    if (photo.base64String) {
      foto.value = `data:image/jpeg;base64,${photo.base64String}`
      fotoAnotada.value = null
      resultadoML.value = null
    }
  } catch {
    // usuario canceló
  }
}

async function seleccionarFoto() {
  const sheet = await actionSheetController.create({
    header: t('home.ganadero.photoLabel'),
    buttons: [
      { text: t('home.ganadero.takePhotoOption'), icon: cameraOutline, handler: () => { tomarFotoDesde(CameraSource.Camera) } },
      { text: t('home.ganadero.chooseFromGallery'), icon: imagesOutline, handler: () => { tomarFotoDesde(CameraSource.Photos) } },
      { text: t('common.cancel'), role: 'cancel' },
    ],
  })
  await sheet.present()
}

async function estimarConIA() {
  if (!foto.value) return

  if (!raza.value) {
    const alert = await alertController.create({
      header: t('home.ganadero.selectBreedTitle'),
      message: t('home.ganadero.selectBreedMessage'),
      buttons: ['OK'],
    })
    await alert.present()
    return
  }

  estimandoPeso.value = true
  resultadoML.value = null
  fotoAnotada.value = null
  try {
    const breed = RAZA_TO_BREED[raza.value] ?? 'default'
    const resultado = await estimarPesoDesdeImagen(foto.value, breed)
    resultadoML.value = resultado
    if (resultado.imagen_anotada) fotoAnotada.value = resultado.imagen_anotada
  } catch (e: any) {
    const msg =
      e?.response?.data?.sugerencia ??
      e?.response?.data?.error ??
      t('home.ganadero.estimateErrorDefault')
    const alert = await alertController.create({
      header: t('home.ganadero.noAnimalDetected'),
      message: msg,
      buttons: ['OK'],
    })
    await alert.present()
  } finally {
    estimandoPeso.value = false
  }
}

function guardarComoAnimal() {
  if (!foto.value || !resultadoML.value) return
  estimacionPendienteStore.setEstimacion({
    foto: foto.value,
    fotoAnotada: fotoAnotada.value,
    raza: raza.value,
    pesoKg: resultadoML.value.peso_estimado_kg > 0 ? resultadoML.value.peso_estimado_kg : null,
    resultadoML: resultadoML.value,
  })
  showEstimador.value = false
  router.push({ name: 'Fincas' })
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

function goToFincas() {
  router.push({ name: 'Fincas' })
}

function goToMiGanado() {
  router.push({ name: 'MiGanado' })
}

function goToReportes() {
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
  background: linear-gradient(135deg, #004c4c, #008080);
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
  background: var(--bov-tint-soft);
  border-radius: 10px;
  padding: 8px;
  margin-bottom: 8px;
}

.stat-icon {
  font-size: 20px;
  color: var(--ion-color-primary);
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
  background: var(--bov-tint-soft);
  border-radius: 10px;
  padding: 10px;
  display: flex;
}

.quick-icon {
  font-size: 22px;
  color: var(--ion-color-primary);
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
  background: var(--bov-tint-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.activity-icon {
  font-size: 20px;
  color: var(--ion-color-primary);
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

.modal-content { --padding-top: 16px; }
.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 0.9rem; font-weight: 600; color: var(--bov-text-strong); margin-bottom: 6px; }
.form-select { --border-radius: 10px; width: 100%; }
.modal-actions { display: flex; flex-direction: column; gap: 8px; margin-top: 24px; }

.foto-preview-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.foto-preview {
  width: 100%;
  max-height: 200px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid var(--ion-color-light-shade);
}

.foto-change-btn { --color: var(--ion-color-medium); }

.ml-resultado {
  margin-top: 10px;
  padding: 12px 14px;
  background: var(--ion-color-tertiary-tint, #f0eaff);
  border-radius: 10px;
  border-left: 4px solid var(--ion-color-tertiary, #7044ff);
}

.ml-peso {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--bov-text-strong);
}

.ml-rango {
  font-size: 0.82rem;
  color: var(--ion-color-medium);
  margin-top: 2px;
}

.ml-advertencia {
  font-size: 0.78rem;
  color: var(--ion-color-warning-shade, #b7660a);
  margin-top: 6px;
}

.foto-anotada {
  width: 100%;
  border-radius: 8px;
  margin-bottom: 10px;
  border: 2px solid #00c84a;
}

.ml-medidas {
  margin-top: 8px;
  border-top: 1px solid var(--bov-border);
  padding-top: 8px;
}

.ml-medida-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.82rem;
  padding: 3px 0;
}

.ml-medida-label { color: var(--ion-color-medium); }
.ml-medida-valor { font-weight: 600; color: var(--bov-text-strong); }
</style>
