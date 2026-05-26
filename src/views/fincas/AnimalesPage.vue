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
} from 'ionicons/icons'

import { onMounted, ref, computed, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getGanadoPorFinca,
  createGanado,
  updateGanado,
  deleteGanado,
  getEstadosSalud,
  getEstadosComerciales,
  type Ganado,
  type Catalogo,
} from '@/api/ganado'
import { getFinca, getFincas, type Finca } from '@/api/fincas'
import { exportarPDF, exportarExcel } from '@/utils/exportarGanado'

const route = useRoute()
const router = useRouter()
const fincaId = Number(route.params.fincaId)

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

const form = reactive({
  arete: '',
  nombre: '',
  raza: '',
  finca_id: fincaId,
  estado_comercial_id: 0,
})

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
  router.push(`/tabs/ganado/${animal.id}/historial`)
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
  form.raza = ''
  form.finca_id = fincaId
  form.estado_comercial_id = estadosComerciales.value[0]?.id ?? 0
  showModal.value = true
}

function editarAnimal(animal: Ganado) {
  editMode.value = true
  animalActual.value = animal
  form.arete = animal.arete
  form.nombre = animal.nombre ?? ''
  form.raza = animal.raza
  form.finca_id = animal.finca_id
  form.estado_comercial_id = animal.estado_comercial_id
  showModal.value = true
}

async function guardar() {
  if (!form.arete || !form.nombre || !form.raza || !form.estado_comercial_id) return
  try {
    if (editMode.value && animalActual.value) {
      await updateGanado(animalActual.value.id, {
        finca_id: form.finca_id,
        arete: form.arete,
        nombre: form.nombre,
        raza: form.raza,
        estado_salud_id: animalActual.value.estado_salud_id,
        estado_comercial_id: form.estado_comercial_id,
      })
    } else {
      await createGanado({
        finca_id: form.finca_id,
        arete: form.arete,
        nombre: form.nombre,
        raza: form.raza,
        estado_salud_id: estadosSalud.value[0]?.id ?? 1,
        estado_comercial_id: form.estado_comercial_id,
      })
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

onMounted(cargar)
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
            <ion-button slot="end" fill="clear" @click.stop="abrirOpciones(animal)">
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

      <ion-fab v-if="!modoSeleccion" vertical="bottom" horizontal="end" slot="fixed">
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
</style>
