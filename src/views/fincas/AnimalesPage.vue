<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSearchbar,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonFab,
  IonFabButton,
  IonModal,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonButtons,
  IonBackButton,
  IonCheckbox,
  IonSpinner,
  alertController,
  actionSheetController,
} from '@ionic/vue'

import {
  addOutline,
  ellipsisVertical,
  logoBuffer,
  documentTextOutline,
  closeOutline,
  checkboxOutline,
  cameraOutline,
  imagesOutline,
  sparklesOutline,
} from 'ionicons/icons'

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { onMounted, ref, computed, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getGanadoPorFinca,
  createGanado,
  updateGanado,
  deleteGanado,
  registrarPeso,
  getEstadosSalud,
  getEstadosComerciales,
  type Ganado,
  type Catalogo,
} from '@/api/ganado'
import { getFinca, getFincas, type Finca } from '@/api/fincas'
import { exportarPDF, exportarExcel } from '@/utils/exportarGanado'
import { estimarPesoDesdeImagen, type MLEstimacion, type MLMedidas } from '@/api/ml'
import { usePermisosGanado } from '@/composables/usePermisosGanado'
import { useEstimacionPendienteStore } from '@/stores/estimacionPendiente'

const route = useRoute()
const router = useRouter()
const fincaId = Number(route.params.fincaId)

const { puedeAgregarGanado, puedeEditarCompleto } = usePermisosGanado()
const estimacionPendienteStore = useEstimacionPendienteStore()

const finca = ref<Finca | null>(null)
const fincas = ref<Finca[]>([])
const animales = ref<Ganado[]>([])
const estadosSalud = ref<Catalogo[]>([])
const estadosComerciales = ref<Catalogo[]>([])
const search = ref('')
const loading = ref(false)
const showModal = ref(false)
const editMode = ref(false)
const animalActual = ref<Ganado | null>(null)

const modoSeleccion = ref(false)
const seleccionados = ref<Set<number>>(new Set())

const foto = ref<string | null>(null)
const fotoAnotada = ref<string | null>(null)
const estimandoPeso = ref(false)
const resultadoML = ref<MLEstimacion | null>(null)

const SEXOS: Array<'Macho' | 'Hembra'> = ['Macho', 'Hembra']

const form = reactive({
  arete: '',
  nombre: '',
  sexo: '' as '' | 'Macho' | 'Hembra',
  raza: '',
  finca_id: fincaId,
  estado_comercial_id: 0,
  peso_kg: '' as string | number,
})

const RAZA_TO_BREED: Record<string, string> = {
  Brahman: 'brahman',
  Cebuíno: 'cebu',
  Criollo: 'criollo',
}

const RAZAS = ['Holstein', 'Angus', 'Jersey', 'Hereford', 'Brahman', 'Simmental', 'Cebuíno', 'Criollo']

const filtrados = computed(() =>
  animales.value.filter((a) => {
    const q = search.value.toLowerCase()
    return (
      a.arete.toLowerCase().includes(q) ||
      (a.nombre ?? '').toLowerCase().includes(q) ||
      a.raza.toLowerCase().includes(q)
    )
  })
)

const animalesSeleccionados = computed(() =>
  filtrados.value.filter((a) => seleccionados.value.has(a.id))
)

function toggleSeleccion(id: number) {
  const s = new Set(seleccionados.value)
  s.has(id) ? s.delete(id) : s.add(id)
  seleccionados.value = s
}

function entrarModoSeleccion() {
  modoSeleccion.value = true
  seleccionados.value = new Set()
}

function salirModoSeleccion() {
  modoSeleccion.value = false
  seleccionados.value = new Set()
}

async function abrirExportar() {
  const lista = animalesSeleccionados.value.length > 0
    ? animalesSeleccionados.value
    : filtrados.value

  const sheet = await actionSheetController.create({
    header: `Exportar ${lista.length} animal${lista.length !== 1 ? 'es' : ''}`,
    buttons: [
      {
        text: 'Exportar PDF',
        handler: () => { exportarPDF(lista, finca.value?.nombre ?? 'Ganado'); salirModoSeleccion() },
      },
      {
        text: 'Exportar Excel',
        handler: () => { exportarExcel(lista, finca.value?.nombre ?? 'Ganado'); salirModoSeleccion() },
      },
      { text: 'Cancelar', role: 'cancel' },
    ],
  })
  await sheet.present()
}

function seleccionarAnimal(animal: Ganado) {
  router.push(`/tabs/ganado/${animal.id}/detalle`)
}

async function cargar() {
  loading.value = true
  try {
    const [f, g, fs, es, ec] = await Promise.all([
      getFinca(fincaId),
      getGanadoPorFinca(fincaId),
      getFincas(),
      getEstadosSalud(),
      getEstadosComerciales(),
    ])
    finca.value = f
    animales.value = g
    fincas.value = fs
    estadosSalud.value = es
    estadosComerciales.value = ec
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function abrirModal() {
  editMode.value = false
  animalActual.value = null
  form.arete = ''
  form.nombre = ''
  form.sexo = ''
  form.raza = ''
  form.finca_id = fincaId
  form.estado_comercial_id = estadosComerciales.value[0]?.id ?? 0
  form.peso_kg = ''
  foto.value = null
  fotoAnotada.value = null
  resultadoML.value = null
  showModal.value = true
}

function abrirModalConEstimacionPendiente() {
  editMode.value = false
  animalActual.value = null
  form.arete = ''
  form.nombre = ''
  form.sexo = ''
  form.raza = estimacionPendienteStore.raza
  form.finca_id = fincaId
  form.estado_comercial_id = estadosComerciales.value[0]?.id ?? 0
  form.peso_kg = estimacionPendienteStore.pesoKg ?? ''
  foto.value = estimacionPendienteStore.foto
  fotoAnotada.value = estimacionPendienteStore.fotoAnotada
  resultadoML.value = estimacionPendienteStore.resultadoML
  estimacionPendienteStore.clear()
  showModal.value = true
}

function editarAnimal(animal: Ganado) {
  editMode.value = true
  animalActual.value = animal
  form.arete = animal.arete
  form.nombre = animal.nombre ?? ''
  form.sexo = animal.sexo ?? ''
  form.raza = animal.raza
  form.finca_id = animal.finca_id
  form.estado_comercial_id = animal.estado_comercial_id
  form.peso_kg = animal.peso_kg ?? ''
  foto.value = animal.imagen ?? null
  resultadoML.value = null
  showModal.value = true
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

  if (!form.raza) {
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
    const breed = RAZA_TO_BREED[form.raza] ?? 'default'
    const resultado = await estimarPesoDesdeImagen(foto.value, breed)
    resultadoML.value = resultado
    if (resultado.imagen_anotada) fotoAnotada.value = resultado.imagen_anotada
    if (resultado.peso_estimado_kg > 0) form.peso_kg = resultado.peso_estimado_kg
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

async function guardar() {
  if (!form.arete || !form.nombre || !form.sexo || !form.raza || !form.estado_comercial_id) return
  try {
    const base = {
      finca_id: form.finca_id,
      arete: form.arete,
      nombre: form.nombre,
      sexo: form.sexo,
      raza: form.raza,
      estado_comercial_id: form.estado_comercial_id,
      ...(foto.value && { imagen: foto.value }),
    }

    // El peso no es una columna de "ganado": se guarda como registro de
    // peso aparte (tabla registro_pesos), igual que en DetalleGanadoPage.vue.
    const pesoNuevo = form.peso_kg !== '' ? Number(form.peso_kg) : null

    if (editMode.value && animalActual.value) {
      await updateGanado(animalActual.value.id, {
        ...base,
        estado_salud_id: animalActual.value.estado_salud_id,
      })
      if (pesoNuevo != null && pesoNuevo !== animalActual.value.peso_kg) {
        await registrarPeso(animalActual.value.id, pesoNuevo)
      }
    } else {
      const nuevo = await createGanado({ ...base, estado_salud_id: estadosSalud.value[0]?.id ?? 1 })
      if (pesoNuevo != null) {
        await registrarPeso(nuevo.id, pesoNuevo)
      }
    }
    showModal.value = false
    await cargar()
  } catch (e) {
    console.error(e)
  }
}

async function abrirOpciones(animal: Ganado) {
  const sheet = await actionSheetController.create({
    header: animal.nombre ?? animal.arete,
    buttons: [
      {
        text: 'Editar',
        handler: () => editarAnimal(animal),
      },
      {
        text: 'Eliminar',
        role: 'destructive',
        handler: async () => {
          const alert = await alertController.create({
            header: 'Eliminar animal',
            message: '¿Desea eliminar este animal?',
            buttons: [
              { text: 'Cancelar', role: 'cancel' },
              {
                text: 'Eliminar',
                role: 'destructive',
                handler: async () => {
                  await deleteGanado(animal.id)
                  await cargar()
                },
              },
            ],
          })
          await alert.present()
        },
      },
      { text: 'Cancelar', role: 'cancel' },
    ],
  })
  await sheet.present()
}

onMounted(async () => {
  await cargar()
  if (estimacionPendienteStore.hayPendiente) {
    abrirModalConEstimacionPendiente()
  }
})
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/fincas" />
        </ion-buttons>
        <ion-title>{{ finca?.nombre ?? 'Animales' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button v-if="modoSeleccion" fill="clear" @click="salirModoSeleccion">
            <ion-icon :icon="closeOutline" />
          </ion-button>
          <ion-button v-else fill="clear" @click="entrarModoSeleccion" :disabled="filtrados.length === 0">
            <ion-icon :icon="documentTextOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-searchbar
        v-model="search"
        placeholder="Buscar animal"
        class="searchbar"
      />

      <!-- Banner modo selección -->
      <div v-if="modoSeleccion" class="seleccion-banner">
        <ion-icon :icon="checkboxOutline" />
        <span>{{ seleccionados.size > 0 ? `${seleccionados.size} seleccionado${seleccionados.size !== 1 ? 's' : ''}` : 'Tocá los animales a exportar' }}</span>
      </div>

      <div v-if="loading" class="empty-state">
        <p>Cargando animales...</p>
      </div>

      <ion-list v-else-if="filtrados.length > 0" class="lista">
        <ion-item
          v-for="animal in filtrados"
          :key="animal.id"
          class="animal-item"
          :class="{ 'item-seleccionado': seleccionados.has(animal.id) }"
          @click="modoSeleccion ? toggleSeleccion(animal.id) : undefined"
        >
          <ion-checkbox
            v-if="modoSeleccion"
            slot="start"
            :checked="seleccionados.has(animal.id)"
            @ionChange="toggleSeleccion(animal.id)"
          />
          <ion-icon v-else :icon="logoBuffer" slot="start" class="animal-icon" />
          <ion-label>
            <div class="animal-arete">#{{ animal.arete }}</div>
            <div class="animal-nombre">{{ animal.nombre ?? animal.raza }}</div>
          </ion-label>
          <template v-if="!modoSeleccion">
            <ion-button slot="end" fill="outline" size="small" color="primary" @click.stop="seleccionarAnimal(animal)">
              Seleccionar
            </ion-button>
            <ion-button v-if="puedeEditarCompleto" slot="end" fill="clear" @click.stop="abrirOpciones(animal)">
              <ion-icon :icon="ellipsisVertical" />
            </ion-button>
          </template>
        </ion-item>
      </ion-list>

      <div v-else class="empty-state">
        <ion-icon :icon="logoBuffer" class="empty-icon" />
        <p>No hay animales registrados.</p>
        <p class="empty-note">Pulsa el botón + para agregar uno.</p>
      </div>

      <ion-fab v-if="!modoSeleccion && puedeAgregarGanado" vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="abrirModal">
          <ion-icon :icon="addOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>

    <!-- Barra inferior modo selección -->
    <div v-if="modoSeleccion" class="export-bar">
      <ion-button expand="block" fill="outline" color="primary" @click="abrirExportar">
        <ion-icon :icon="documentTextOutline" slot="start" />
        {{ seleccionados.size > 0 ? `Exportar ${seleccionados.size} seleccionado${seleccionados.size !== 1 ? 's' : ''}` : 'Exportar todos' }}
      </ion-button>
    </div>

    <!-- MODAL NUEVO / EDITAR ANIMAL -->
    <ion-modal :is-open="showModal" @did-dismiss="showModal = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>{{ editMode ? 'Editar Animal' : 'Nuevo Animal' }}</ion-title>
          <ion-buttons slot="end">
            <ion-button fill="clear" @click="showModal = false">✕</ion-button>
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
            {{ estimandoPeso ? 'Estimando...' : 'Estimar peso con IA' }}
          </ion-button>
          <div v-if="resultadoML" class="ml-resultado">
            <!-- Imagen anotada con el animal marcado -->
            <img v-if="fotoAnotada" :src="fotoAnotada" class="foto-anotada" alt="Animal detectado" />

            <div class="ml-peso">~{{ resultadoML.peso_estimado_kg }} kg estimados</div>
            <div class="ml-rango">Rango: {{ resultadoML.rango_min_kg }} – {{ resultadoML.rango_max_kg }} kg · Confianza: {{ Math.round(resultadoML.confianza * 100) }}%</div>

            <!-- Medidas corporales -->
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

        <!-- PESO -->
        <div class="form-group">
          <label class="form-label">Peso (kg)</label>
          <ion-input
            v-model="form.peso_kg"
            type="number"
            placeholder="Ej: 450"
            class="form-input"
            fill="outline"
            inputmode="decimal"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Número de Identificación *</label>
          <ion-input v-model="form.arete" placeholder="Ej: 01239" class="form-input" fill="outline" />
        </div>

        <div class="form-group">
          <label class="form-label">Nombre *</label>
          <ion-input v-model="form.nombre" placeholder="Ej: Vaca 50" class="form-input" fill="outline" />
        </div>

        <div class="form-group">
          <label class="form-label">Finca *</label>
          <ion-select v-model="form.finca_id" class="form-select" fill="outline">
            <ion-select-option v-for="f in fincas" :key="f.id" :value="f.id">{{ f.nombre }}</ion-select-option>
          </ion-select>
        </div>

        <div class="form-group">
          <label class="form-label">Raza *</label>
          <ion-select v-model="form.raza" placeholder="Selecciona la raza" class="form-select" fill="outline">
            <ion-select-option v-for="r in RAZAS" :key="r" :value="r">{{ r }}</ion-select-option>
          </ion-select>
        </div>

        <div class="form-group">
          <label class="form-label">Sexo *</label>
          <ion-select v-model="form.sexo" placeholder="Selecciona el sexo" class="form-select" fill="outline">
            <ion-select-option v-for="s in SEXOS" :key="s" :value="s">{{ s }}</ion-select-option>
          </ion-select>
        </div>

        <div class="form-group">
          <label class="form-label">Estado *</label>
          <ion-select v-model="form.estado_comercial_id" placeholder="Selecciona el estado" class="form-select" fill="outline">
            <ion-select-option v-for="e in estadosComerciales" :key="e.id" :value="e.id">{{ e.nombre }}</ion-select-option>
          </ion-select>
        </div>

        <div class="modal-actions">
          <ion-button expand="block" fill="outline" @click="showModal = false">Cancelar</ion-button>
          <ion-button expand="block" color="primary" @click="guardar">
            {{ editMode ? 'Actualizar Animal' : 'Registrar Animal' }}
          </ion-button>
        </div>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<style scoped>
.searchbar {
  --padding-start: 6px;
  --padding-end: 6px;
  padding: 8px 4px 0;
}

.lista { padding: 8px; }

.animal-item {
  margin-bottom: 8px;
  border-radius: 12px;
  --background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  --padding-top: 10px;
  --padding-bottom: 10px;
}

.item-seleccionado {
  --background: #e8f5e9;
  --border-color: var(--ion-color-primary);
}

.animal-icon { font-size: 28px; color: var(--ion-color-medium); }
.animal-arete { font-weight: 700; font-size: 1rem; color: var(--ion-color-dark); }
.animal-nombre { font-size: 0.85rem; color: var(--ion-color-medium); margin-top: 2px; }

.empty-state { text-align: center; padding: 48px 16px; color: var(--ion-color-medium); }
.empty-icon { font-size: 48px; margin-bottom: 12px; color: var(--ion-color-medium); }
.empty-note { font-size: 0.9rem; margin-top: 4px; }

.seleccion-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--ion-color-primary-tint);
  color: var(--ion-color-primary-shade);
  font-size: 0.88rem;
  font-weight: 600;
}

.export-bar {
  padding: 12px 16px;
  background: #fff;
  border-top: 1px solid var(--ion-color-light-shade);
}

.modal-content { --padding-top: 16px; }
.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 0.9rem; font-weight: 600; color: var(--ion-color-dark); margin-bottom: 6px; }
.form-input, .form-select { --border-radius: 10px; width: 100%; }
.modal-actions { display: flex; flex-direction: column; gap: 8px; margin-top: 24px; }
ion-button { --border-radius: 10px; }

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
