<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonSpinner,
  IonModal,
  IonInput,
  IonSelect,
  IonSelectOption,
} from '@ionic/vue'

import {
  personCircleOutline,
  createOutline,
  logoBuffer,
  refreshCircleOutline,
  scaleOutline,
  cameraOutline,
  imagesOutline,
  sparklesOutline,
} from 'ionicons/icons'

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { onMounted, ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getGanado,
  updateGanado,
  registrarPeso,
  getEstadosSalud,
  getEstadosComerciales,
  actualizarEstadoSalud,
  type Ganado,
  type Catalogo,
} from '@/api/ganado'
import { getFincas, type Finca } from '@/api/fincas'
import { estimarPesoDesdeImagen, type MLEstimacion } from '@/api/ml'
import { alertController, actionSheetController } from '@ionic/vue'
import { usePermisosGanado } from '@/composables/usePermisosGanado'
import { useOfflineSync } from '@/composables/useOfflineSync'
import { useToast } from '@/composables/useToast'
import { useI18n } from 'vue-i18n'

const { isOnline, enqueue } = useOfflineSync()
const toast = useToast()
const { t } = useI18n()

const route = useRoute()
const router = useRouter()
const animalId = Number(route.params.animalId)

const animal = ref<Ganado | null>(null)
const loading = ref(false)

const { puedeEditarCompleto, puedeEditarEstadoSalud, campoEstadoPrincipal } = usePermisosGanado()

const fincas = ref<Finca[]>([])
const estadosComerciales = ref<Catalogo[]>([])
const estadosSalud = ref<Catalogo[]>([])

const showModal = ref(false)
const foto = ref<string | null>(null)
const fotoAnotada = ref<string | null>(null)
const estimandoPeso = ref(false)
const resultadoML = ref<MLEstimacion | null>(null)

const RAZAS = ['Holstein', 'Angus', 'Jersey', 'Hereford', 'Brahman', 'Simmental', 'Cebuíno', 'Criollo']
const RAZA_TO_BREED: Record<string, string> = {
  Brahman: 'brahman',
  Cebuíno: 'cebu',
  Criollo: 'criollo',
}
const SEXOS: Array<'Macho' | 'Hembra'> = ['Macho', 'Hembra']

const form = reactive({
  arete: '',
  nombre: '',
  sexo: '' as '' | 'Macho' | 'Hembra',
  raza: '',
  finca_id: 0,
  estado_comercial_id: 0,
  peso_kg: '' as string | number,
})

async function cargar() {
  loading.value = true
  try {
    const [a, fs, ec, es] = await Promise.all([
      getGanado(animalId),
      getFincas(),
      getEstadosComerciales(),
      getEstadosSalud(),
    ])
    animal.value = a
    fincas.value = fs
    estadosComerciales.value = ec
    estadosSalud.value = es
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function abrirEditar() {
  if (!animal.value) return
  form.arete = animal.value.arete
  form.nombre = animal.value.nombre ?? ''
  form.sexo = animal.value.sexo ?? ''
  form.raza = animal.value.raza
  form.finca_id = animal.value.finca_id
  form.estado_comercial_id = animal.value.estado_comercial_id
  form.peso_kg = animal.value.peso_kg ?? ''
  foto.value = animal.value.imagen ?? null
  fotoAnotada.value = null
  resultadoML.value = null
  showModal.value = true
}

async function abrirSelectorEstadoSalud() {
  if (!puedeEditarEstadoSalud.value || !animal.value) return

  const sheet = await actionSheetController.create({
    header: t('detalle.healthStateSheetTitle'),
    buttons: [
      ...estadosSalud.value.map((estado) => ({
        text: estado.nombre,
        handler: async () => {
          try {
            animal.value = await actualizarEstadoSalud(animal.value!.id, estado.id)
          } catch (e: any) {
            const alert = await alertController.create({
              header: t('detalle.updateErrorTitle'),
              message: e?.response?.data?.message ?? t('detalle.updateErrorDefault'),
              buttons: ['OK'],
            })
            await alert.present()
          }
        },
      })),
      { text: t('common.cancel'), role: 'cancel' },
    ],
  })
  await sheet.present()
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

  if (!form.raza) {
    const alert = await alertController.create({
      header: t('home.ganadero.selectBreedTitle'),
      message: t('home.ganadero.selectBreedMessage'),
      buttons: ['OK'],
    })
    await alert.present()
    return
  }

  const breed = RAZA_TO_BREED[form.raza] ?? 'default'

  if (!isOnline.value) {
    // Sin conexión: la estimación por IA requiere el microservicio ML, así que
    // se guarda la foto localmente y se encola para procesarla al volver la red.
    if (!animal.value) return
    try {
      const base64 = foto.value.replace(/^data:image\/\w+;base64,/, '')
      const fotoPath = `pending-estimaciones/${animal.value.id}-${Date.now()}.jpg`
      await Filesystem.writeFile({ path: fotoPath, data: base64, directory: Directory.Data, recursive: true })
      await enqueue('ml.estimar', { ganadoId: animal.value.id, fotoPath, breed })
      toast.warning(t('detalle.offlinePhotoSavedToast'))
    } catch (e) {
      console.error(e)
      toast.error(t('detalle.photoSaveErrorToast'))
    }
    return
  }

  estimandoPeso.value = true
  resultadoML.value = null
  fotoAnotada.value = null
  try {
    const resultado = await estimarPesoDesdeImagen(foto.value, breed)
    resultadoML.value = resultado
    if (resultado.imagen_anotada) fotoAnotada.value = resultado.imagen_anotada
    if (resultado.peso_estimado_kg > 0) form.peso_kg = resultado.peso_estimado_kg
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

async function guardar() {
  if (!form.arete || !form.nombre || !form.sexo || !form.raza || !form.estado_comercial_id) return
  if (!animal.value) return
  try {
    const datos = {
      finca_id: form.finca_id,
      arete: form.arete,
      nombre: form.nombre,
      sexo: form.sexo,
      raza: form.raza,
      estado_comercial_id: form.estado_comercial_id,
      estado_salud_id: animal.value.estado_salud_id,
      ...(foto.value && { imagen: foto.value }),
    }

    // El peso se guarda como registro de peso (tabla aparte), solo si cambió.
    const pesoNuevo = form.peso_kg !== '' ? Number(form.peso_kg) : null

    if (!isOnline.value) {
      await enqueue('ganado.update', { ganadoId: animal.value.id, data: datos })
      if (pesoNuevo != null && pesoNuevo !== animal.value.peso_kg) {
        await enqueue('peso.registrar', { ganadoId: animal.value.id, peso: pesoNuevo })
      }
      toast.warning(t('common.offlineSavedToast'))
      showModal.value = false
      return
    }

    await updateGanado(animal.value.id, datos)
    if (pesoNuevo != null && pesoNuevo !== animal.value.peso_kg) {
      await registrarPeso(animal.value.id, pesoNuevo)
    }

    showModal.value = false
    await cargar()
  } catch (e) {
    console.error(e)
  }
}

function verHistorial() {
  router.push(`/tabs/ganado/${animalId}/historial`)
}

onMounted(cargar)
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/fincas" />
        </ion-buttons>
        <ion-title>{{ t('detalle.title') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button v-if="puedeEditarCompleto" fill="clear" :disabled="!animal" @click="abrirEditar">
            <ion-icon :icon="createOutline" />
          </ion-button>
          <ion-button fill="clear" @click="router.push('/tabs/perfil')">
            <ion-icon :icon="personCircleOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="wrap">

        <div v-if="loading" class="estado-centro">
          <ion-spinner name="crescent" />
        </div>

        <div v-else-if="animal" class="contenido">

          <!-- FOTO -->
          <div class="foto-card">
            <img v-if="animal.imagen" :src="animal.imagen" class="foto-img" :alt="t('home.ganadero.photoLabel')" />
            <div v-else class="foto-placeholder">
              <ion-icon :icon="logoBuffer" class="foto-placeholder-icon" />
            </div>

            <div class="foto-badge">
              {{ animal.estado_salud?.nombre ?? t('detalle.defaultStatus') }}
            </div>

            <div class="foto-overlay">
              <div class="foto-nombre">{{ animal.nombre ?? animal.raza }}</div>
              <div class="foto-arete">#{{ animal.arete }}</div>
            </div>
          </div>

          <!-- PESO -->
          <div class="peso-card">
            <div class="peso-icono">
              <ion-icon :icon="scaleOutline" />
            </div>
            <div class="peso-info">
              <div class="peso-label">{{ t('detalle.lastWeight') }}</div>
              <div class="peso-valor">
                {{ animal.peso_kg != null ? animal.peso_kg : '—' }}
                <span class="peso-unidad">kg</span>
              </div>
            </div>
          </div>

          <!-- DATOS -->
          <div class="info-grid">
            <div class="info-col">
              <div class="info-titulo">{{ t('detalle.breedTitle') }}</div>
              <div class="info-valor">{{ animal.raza }}</div>
              <div class="info-sub">
                <span class="dot dot-rojo" />
                {{ animal.sexo ?? t('detalle.noSex') }}
              </div>
            </div>

            <div
              class="info-col"
              :class="{ 'info-col-tocable': puedeEditarEstadoSalud }"
              @click="puedeEditarEstadoSalud ? abrirSelectorEstadoSalud() : undefined"
            >
              <div class="info-titulo">{{ t('detalle.stateTitle') }}</div>
              <div class="info-valor">{{ animal[campoEstadoPrincipal]?.nombre ?? '—' }}</div>
              <div class="info-sub">
                <span class="dot" :class="puedeEditarEstadoSalud ? 'dot-azul' : 'dot-verde'" />
                {{ puedeEditarEstadoSalud ? t('detalle.tapToChange') : (animal.estado_salud?.nombre ?? '—') }}
              </div>
            </div>
          </div>

          <!-- HISTORIAL -->
          <ion-button expand="block" color="primary" class="btn-historial" @click="verHistorial">
            <ion-icon :icon="refreshCircleOutline" slot="start" />
            {{ t('detalle.viewFullHistory') }}
          </ion-button>

        </div>

        <div v-else class="estado-centro">
          <p>{{ t('detalle.notFound') }}</p>
        </div>

      </div>
    </ion-content>

    <!-- MODAL EDITAR ANIMAL -->
    <ion-modal :is-open="showModal" @did-dismiss="showModal = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>{{ t('animales.editAnimal') }}</ion-title>
          <ion-buttons slot="end">
            <ion-button fill="clear" @click="showModal = false">✕</ion-button>
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

        <!-- ESTIMAR CON IA -->
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
            <div v-if="resultadoML.advertencia" class="ml-advertencia">{{ resultadoML.advertencia }}</div>
          </div>
        </div>

        <!-- PESO -->
        <div class="form-group">
          <label class="form-label">{{ t('animales.weightLabel') }}</label>
          <ion-input
            v-model="form.peso_kg"
            type="number"
            :placeholder="t('animales.weightPlaceholder')"
            class="form-input"
            fill="outline"
            inputmode="decimal"
          />
        </div>

        <div class="form-group">
          <label class="form-label">{{ t('animales.idLabel') }}</label>
          <ion-input v-model="form.arete" :placeholder="t('animales.idPlaceholder')" class="form-input" fill="outline" />
        </div>

        <div class="form-group">
          <label class="form-label">{{ t('animales.nameLabel') }}</label>
          <ion-input v-model="form.nombre" :placeholder="t('animales.namePlaceholder')" class="form-input" fill="outline" />
        </div>

        <div class="form-group">
          <label class="form-label">{{ t('animales.farmLabel') }}</label>
          <ion-select v-model="form.finca_id" class="form-select" fill="outline">
            <ion-select-option v-for="f in fincas" :key="f.id" :value="f.id">{{ f.nombre }}</ion-select-option>
          </ion-select>
        </div>

        <div class="form-group">
          <label class="form-label">{{ t('home.ganadero.breedLabel') }}</label>
          <ion-select v-model="form.raza" :placeholder="t('home.ganadero.selectBreed')" class="form-select" fill="outline">
            <ion-select-option v-for="r in RAZAS" :key="r" :value="r">{{ r }}</ion-select-option>
          </ion-select>
        </div>

        <div class="form-group">
          <label class="form-label">{{ t('animales.sexLabel') }}</label>
          <ion-select v-model="form.sexo" :placeholder="t('animales.selectSex')" class="form-select" fill="outline">
            <ion-select-option v-for="s in SEXOS" :key="s" :value="s">{{ s }}</ion-select-option>
          </ion-select>
        </div>

        <div class="form-group">
          <label class="form-label">{{ t('animales.stateLabel') }}</label>
          <ion-select v-model="form.estado_comercial_id" :placeholder="t('animales.selectState')" class="form-select" fill="outline">
            <ion-select-option v-for="e in estadosComerciales" :key="e.id" :value="e.id">{{ e.nombre }}</ion-select-option>
          </ion-select>
        </div>

        <div class="modal-actions">
          <ion-button expand="block" fill="outline" @click="showModal = false">{{ t('common.cancel') }}</ion-button>
          <ion-button expand="block" color="primary" @click="guardar">{{ t('animales.updateAnimal') }}</ion-button>
        </div>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<style scoped>
.wrap {
  background: var(--ion-background-color);
  min-height: 100%;
}

.estado-centro {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 60vh;
  color: var(--ion-color-medium);
}

/* FOTO */
.foto-card {
  position: relative;
  margin: 16px;
  height: 240px;
  border-radius: 18px;
  overflow: hidden;
  background: #cfd8dc;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
}

.foto-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.foto-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.foto-placeholder-icon {
  font-size: 72px;
  color: #90a4ae;
}

.foto-badge {
  position: absolute;
  top: 14px;
  left: 14px;
  background: var(--bov-surface);
  color: var(--bov-success-soft-text);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  padding: 5px 14px;
  border-radius: 20px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.foto-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 18px 16px 16px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
}

.foto-nombre {
  color: #fff;
  font-size: 1.6rem;
  font-weight: 700;
  line-height: 1.1;
}

.foto-arete {
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.9rem;
  margin-top: 2px;
}

/* PESO */
.peso-card {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 0 16px;
  background: var(--bov-success-soft-bg);
  border-radius: 16px;
  padding: 16px 18px;
}

.peso-icono {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: var(--bov-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.peso-icono ion-icon {
  font-size: 24px;
  color: var(--bov-success-soft-text);
}

.peso-label {
  font-size: 0.82rem;
  color: var(--bov-success-soft-text);
  font-weight: 600;
}

.peso-valor {
  font-size: 1.9rem;
  font-weight: 800;
  color: var(--bov-success-soft-text);
  line-height: 1.1;
}

.peso-unidad {
  font-size: 1rem;
  font-weight: 600;
}

/* GRID INFO */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 20px 16px;
}

.info-col {
  padding: 0 4px;
}

.info-titulo {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--ion-color-medium);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 8px;
}

.info-valor {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--bov-text-strong);
  margin-bottom: 8px;
}

.info-sub {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ion-color-medium);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-rojo {
  background: #e53935;
}

.dot-verde {
  background: #43a047;
}

.dot-azul {
  background: #1e88e5;
}

.info-col-tocable {
  cursor: pointer;
}

/* BOTÓN HISTORIAL */
.btn-historial {
  margin: 8px 16px 24px;
  --border-radius: 12px;
  height: 50px;
  font-weight: 600;
}

/* MODAL */
.modal-content { --padding-top: 16px; }
.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 0.9rem; font-weight: 600; color: var(--bov-text-strong); margin-bottom: 6px; }
.form-input, .form-select { --border-radius: 10px; width: 100%; }
.modal-actions { display: flex; flex-direction: column; gap: 8px; margin-top: 24px; }

.foto-preview-container { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.foto-preview { width: 100%; max-height: 200px; object-fit: cover; border-radius: 10px; border: 1px solid var(--ion-color-light-shade); }
.foto-change-btn { --color: var(--ion-color-medium); }
.foto-anotada { width: 100%; border-radius: 8px; margin-bottom: 10px; border: 2px solid #00c84a; }

.ml-resultado { margin-top: 10px; padding: 12px 14px; background: var(--ion-color-tertiary-tint, #f0eaff); border-radius: 10px; border-left: 4px solid var(--ion-color-tertiary, #7044ff); }
.ml-peso { font-size: 1.2rem; font-weight: 700; color: var(--bov-text-strong); }
.ml-rango { font-size: 0.82rem; color: var(--ion-color-medium); margin-top: 2px; }
.ml-advertencia { font-size: 0.78rem; color: var(--ion-color-warning-shade, #b7660a); margin-top: 6px; }
</style>
