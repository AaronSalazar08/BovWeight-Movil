<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>BovWeight CR</ion-title>
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
            <p class="greeting">Bienvenido,</p>
            <h2 class="user-name">{{ authStore.userDisplayName }}</h2>
            <ion-badge color="primary">Ganadero</ion-badge>
          </div>
        </div>
      </div>

      <!-- Módulos -->
      <div class="section-title">
        <h3>Módulos</h3>
      </div>

      <div class="modules-grid">
        <button class="module-card" type="button" @click="goToFincas">
          <ion-icon :icon="businessOutline" class="module-icon" />
          <p class="module-label">Mis Fincas</p>
          <ion-badge color="success" class="module-badge">Gestiona tus fincas</ion-badge>
        </button>

        <button class="module-card" type="button" @click="goToMiGanado">
          <ion-icon :icon="pawOutline" class="module-icon" />
          <p class="module-label">Mi Ganado</p>
          <ion-badge color="success" class="module-badge">Ver animales</ion-badge>
        </button>

        <button class="module-card" type="button" @click="abrirEstimador">
          <ion-icon :icon="cameraOutline" class="module-icon" />
          <p class="module-label">Estimar Peso</p>
          <ion-badge color="success" class="module-badge">Estimar ahora</ion-badge>
        </button>

        <button class="module-card" type="button" @click="goToReportes">
          <ion-icon :icon="barChartOutline" class="module-icon" />
          <p class="module-label">Reportes y Estadísticas</p>
          <ion-badge color="success" class="module-badge">Ver reportes</ion-badge>
        </button>
      </div>

      <!-- Aviso legal -->
      <div class="legal-notice">
        <ion-icon :icon="informationCircleOutline" />
        <p>
          Los resultados de estimación de peso son aproximaciones y
          <strong>no sustituyen mediciones oficiales</strong> con báscula certificada.
        </p>
      </div>
    </ion-content>

    <!-- MODAL ESTIMAR PESO -->
    <ion-modal :is-open="showEstimador" @did-dismiss="cerrarEstimador">
      <ion-header>
        <ion-toolbar>
          <ion-title>Estimar Peso</ion-title>
          <ion-buttons slot="end">
            <ion-button fill="clear" @click="cerrarEstimador">✕</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content class="ion-padding modal-content">
        <!-- FOTO -->
        <div class="form-group">
          <label class="form-label">Foto del animal</label>
          <div v-if="foto" class="foto-preview-container">
            <img :src="foto" class="foto-preview" alt="Foto del animal" />
            <ion-button fill="clear" size="small" class="foto-change-btn" @click="seleccionarFoto">
              <ion-icon :icon="cameraOutline" slot="start" />
              Cambiar foto
            </ion-button>
          </div>
          <ion-button v-else expand="block" fill="outline" color="medium" @click="seleccionarFoto">
            <ion-icon :icon="cameraOutline" slot="start" />
            Tomar foto / Cargar imagen
          </ion-button>
        </div>

        <!-- RAZA -->
        <div v-if="foto" class="form-group">
          <label class="form-label">Raza *</label>
          <ion-select v-model="raza" placeholder="Selecciona la raza" class="form-select" fill="outline">
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
            {{ estimandoPeso ? 'Estimando...' : 'Estimar peso con IA' }}
          </ion-button>

          <div v-if="resultadoML" class="ml-resultado">
            <img v-if="fotoAnotada" :src="fotoAnotada" class="foto-anotada" alt="Animal detectado" />

            <div class="ml-peso">~{{ resultadoML.peso_estimado_kg }} kg estimados</div>
            <div class="ml-rango">Rango: {{ resultadoML.rango_min_kg }} – {{ resultadoML.rango_max_kg }} kg · Confianza: {{ Math.round(resultadoML.confianza * 100) }}%</div>

            <div v-if="resultadoML.medidas && resultadoML.medidas.perimetro_toracico_cm > 0" class="ml-medidas">
              <div class="ml-medida-item">
                <span class="ml-medida-label">Perímetro torácico</span>
                <span class="ml-medida-valor">{{ resultadoML.medidas.perimetro_toracico_cm }} cm</span>
              </div>
              <div class="ml-medida-item">
                <span class="ml-medida-label">Largo del cuerpo</span>
                <span class="ml-medida-valor">{{ resultadoML.medidas.largo_cuerpo_cm }} cm</span>
              </div>
              <div class="ml-medida-item">
                <span class="ml-medida-label">Altura</span>
                <span class="ml-medida-valor">{{ resultadoML.medidas.altura_cm }} cm</span>
              </div>
            </div>

            <div v-if="resultadoML.advertencia" class="ml-advertencia">{{ resultadoML.advertencia }}</div>
          </div>
        </div>

        <div v-if="resultadoML" class="modal-actions">
          <ion-button expand="block" fill="outline" @click="cerrarEstimador">
            Solo estimar (no guardar)
          </ion-button>
          <ion-button expand="block" color="primary" @click="guardarComoAnimal">
            Guardar como animal
          </ion-button>
        </div>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
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
  imagesOutline, sparklesOutline,
} from 'ionicons/icons'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { useAuthStore } from '@/stores/auth'
import { estimarPesoDesdeImagen, type MLEstimacion } from '@/api/ml'
import { useEstimacionPendienteStore } from '@/stores/estimacionPendiente'

const router = useRouter()
const authStore = useAuthStore()
const estimacionPendienteStore = useEstimacionPendienteStore()

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
    header: 'Foto del animal',
    buttons: [
      { text: 'Tomar foto', icon: cameraOutline, handler: () => { tomarFotoDesde(CameraSource.Camera) } },
      { text: 'Elegir de galería', icon: imagesOutline, handler: () => { tomarFotoDesde(CameraSource.Photos) } },
      { text: 'Cancelar', role: 'cancel' },
    ],
  })
  await sheet.present()
}

async function estimarConIA() {
  if (!foto.value) return

  if (!raza.value) {
    const alert = await alertController.create({
      header: 'Selecciona la raza',
      message: 'Para una mejor estimación, selecciona la raza del animal antes de estimar.',
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
      'No se pudo estimar el peso. Asegúrese de que el animal sea visible de perfil y bien iluminado.'
    const alert = await alertController.create({
      header: 'No se detectó el animal',
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
    header: 'Cerrar sesión',
    message: '¿Estás seguro de que deseas salir?',
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Cerrar sesión',
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
  await authStore.fetchCurrentUser()
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
  --background: #f0f4f8;
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
  color: #333;
  margin: 0;
}

.modules-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 0 16px;
  color: #1a1a1a;
}

.module-card {
  background: #ffffff;
  border-radius: 14px;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  border: none;
  transition: transform 0.15s ease;
}

.module-card:active {
  transform: scale(0.96);
}

.module-icon {
  font-size: 32px;
  color: var(--ion-color-primary);
}

.module-label {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.module-badge {
  font-size: 10px;
}

.legal-notice {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 20px 16px 32px;
  background: #fff8e1;
  border: 1px solid #ffe082;
  border-radius: 10px;
  padding: 12px 14px;
  color: #795548;
  font-size: 12px;
  line-height: 1.5;
}

.legal-notice ion-icon {
  font-size: 18px;
  flex-shrink: 0;
  margin-top: 1px;
  color: #f57c00;
}

.legal-notice p {
  margin: 0;
}

.modal-content { --padding-top: 16px; }
.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 0.9rem; font-weight: 600; color: var(--ion-color-dark); margin-bottom: 6px; }
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
  color: var(--ion-color-dark);
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
  border-top: 1px solid rgba(0,0,0,0.08);
  padding-top: 8px;
}

.ml-medida-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.82rem;
  padding: 3px 0;
}

.ml-medida-label { color: var(--ion-color-medium); }
.ml-medida-valor { font-weight: 600; color: var(--ion-color-dark); }
</style>
