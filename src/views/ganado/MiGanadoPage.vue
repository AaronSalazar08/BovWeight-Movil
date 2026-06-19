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
  IonIcon,
  IonButtons,
  IonBackButton,
  IonButton,
  IonModal,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonCheckbox,
  alertController,
  actionSheetController,
} from '@ionic/vue'

import { logoBuffer, ellipsisVertical, documentTextOutline, closeOutline, checkboxOutline } from 'ionicons/icons'
import { onMounted, ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import {
  getTodoElGanado,
  updateGanado,
  deleteGanado,
  getEstadosComerciales,
  type Ganado,
  type Catalogo,
} from '@/api/ganado'
import { getFincas, type Finca } from '@/api/fincas'
import { exportarPDF, exportarExcel } from '@/utils/exportarGanado'
import { usePermisosGanado } from '@/composables/usePermisosGanado'
import { useToast } from '@/composables/useToast'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { puedeEditarCompleto } = usePermisosGanado()
const toast = useToast()
const { t } = useI18n()

const animales = ref<Ganado[]>([])
const fincas = ref<Finca[]>([])
const estadosComerciales = ref<Catalogo[]>([])
const search = ref('')
const loading = ref(false)
const showModal = ref(false)
const animalActual = ref<Ganado | null>(null)

const modoSeleccion = ref(false)
const seleccionados = ref<Set<number>>(new Set())

const RAZAS = ['Holstein', 'Angus', 'Jersey', 'Hereford', 'Brahman', 'Simmental', 'Cebuíno', 'Criollo']
const SEXOS: Array<'Macho' | 'Hembra'> = ['Macho', 'Hembra']

const form = reactive({
  arete: '',
  nombre: '',
  sexo: '' as '' | 'Macho' | 'Hembra',
  raza: '',
  finca_id: 0,
  estado_comercial_id: 0,
})

const filtrados = computed(() => {
  const q = search.value.toLowerCase()
  return animales.value.filter((a) =>
    a.arete.toLowerCase().includes(q) ||
    (a.nombre ?? '').toLowerCase().includes(q) ||
    a.raza.toLowerCase().includes(q) ||
    (a.finca?.nombre ?? '').toLowerCase().includes(q)
  )
})

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

function seleccionarAnimal(animal: Ganado) {
  router.push(`/tabs/ganado/${animal.id}/detalle`)
}

async function abrirExportar() {
  const lista = animalesSeleccionados.value.length > 0
    ? animalesSeleccionados.value
    : filtrados.value

  const sheet = await actionSheetController.create({
    header: t(lista.length !== 1 ? 'animales.exportHeaderPlural' : 'animales.exportHeaderSingular', { count: lista.length }),
    buttons: [
      {
        text: t('animales.exportPdf'),
        handler: () => { exportarPDF(lista, 'Mi Ganado'); salirModoSeleccion() },
      },
      {
        text: t('animales.exportExcel'),
        handler: () => { exportarExcel(lista, 'Mi Ganado'); salirModoSeleccion() },
      },
      { text: t('common.cancel'), role: 'cancel' },
    ],
  })
  await sheet.present()
}

async function cargar() {
  loading.value = true
  try {
    const [g, fs, ec] = await Promise.all([
      getTodoElGanado(),
      getFincas(),
      getEstadosComerciales(),
    ])
    animales.value = g
    fincas.value = fs
    estadosComerciales.value = ec
  } catch (e: any) {
    console.error(e)
    toast.error(e?.response?.data?.message ?? t('common.loadErrorToast'))
  } finally {
    loading.value = false
  }
}

function editarAnimal(animal: Ganado) {
  animalActual.value = animal
  form.arete = animal.arete
  form.nombre = animal.nombre ?? ''
  form.sexo = animal.sexo ?? ''
  form.raza = animal.raza
  form.finca_id = animal.finca_id
  form.estado_comercial_id = animal.estado_comercial_id
  showModal.value = true
}

async function guardar() {
  if (!form.arete || !form.nombre || !form.sexo || !form.raza || !form.estado_comercial_id || !animalActual.value) return
  try {
    await updateGanado(animalActual.value.id, {
      finca_id: form.finca_id,
      arete: form.arete,
      nombre: form.nombre,
      sexo: form.sexo,
      raza: form.raza,
      estado_salud_id: animalActual.value.estado_salud_id,
      estado_comercial_id: form.estado_comercial_id,
    })
    showModal.value = false
    await cargar()
  } catch (e: any) {
    console.error(e)
    toast.error(e?.response?.data?.message ?? t('common.saveErrorToast'))
  }
}

async function abrirOpciones(animal: Ganado) {
  const sheet = await actionSheetController.create({
    header: animal.nombre ?? animal.arete,
    buttons: [
      {
        text: t('fincas.edit'),
        handler: () => editarAnimal(animal),
      },
      {
        text: t('fincas.delete'),
        role: 'destructive',
        handler: async () => {
          const alert = await alertController.create({
            header: t('animales.deleteAnimalTitle'),
            message: t('animales.deleteAnimalMessage'),
            buttons: [
              { text: t('common.cancel'), role: 'cancel' },
              {
                text: t('fincas.delete'),
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
      { text: t('common.cancel'), role: 'cancel' },
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
          <ion-back-button default-href="/tabs/home" />
        </ion-buttons>
        <ion-title>{{ t('home.ganadero.myCattle') }}</ion-title>
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
      <ion-searchbar v-model="search" :placeholder="t('animales.searchPlaceholder')" class="searchbar" />

      <!-- Banner modo selección -->
      <div v-if="modoSeleccion" class="seleccion-banner">
        <ion-icon :icon="checkboxOutline" />
        <span>{{ seleccionados.size > 0 ? t(seleccionados.size !== 1 ? 'animales.selectedPlural' : 'animales.selectedSingular', { count: seleccionados.size }) : t('animales.tapToExport') }}</span>
      </div>

      <div v-if="loading" class="empty-state">
        <p>{{ t('animales.loading') }}</p>
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
            <div v-if="animal.finca" class="animal-finca">{{ animal.finca.nombre }}</div>
          </ion-label>
          <template v-if="!modoSeleccion">
            <ion-button slot="end" fill="outline" size="small" color="primary" @click.stop="seleccionarAnimal(animal)">
              {{ t('fincas.select') }}
            </ion-button>
            <ion-button v-if="puedeEditarCompleto" slot="end" fill="clear" @click.stop="abrirOpciones(animal)">
              <ion-icon :icon="ellipsisVertical" />
            </ion-button>
          </template>
        </ion-item>
      </ion-list>

      <div v-else class="empty-state">
        <ion-icon :icon="logoBuffer" class="empty-icon" />
        <p>{{ t('animales.emptyTitle') }}</p>
      </div>
    </ion-content>

    <!-- Barra inferior modo selección -->
    <div v-if="modoSeleccion" class="export-bar">
      <ion-button expand="block" fill="outline" color="primary" @click="abrirExportar">
        <ion-icon :icon="documentTextOutline" slot="start" />
        {{ seleccionados.size > 0 ? t(seleccionados.size !== 1 ? 'animales.exportSelectedPlural' : 'animales.exportSelectedSingular', { count: seleccionados.size }) : t('animales.exportAll') }}
      </ion-button>
    </div>

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
        <div class="form-group">
          <label class="form-label">{{ t('animales.idLabel') }}</label>
          <ion-input v-model="form.arete" class="form-input" fill="outline" />
        </div>

        <div class="form-group">
          <label class="form-label">{{ t('animales.nameLabel') }}</label>
          <ion-input v-model="form.nombre" class="form-input" fill="outline" />
        </div>

        <div class="form-group">
          <label class="form-label">{{ t('animales.farmLabel') }}</label>
          <ion-select v-model="form.finca_id" class="form-select" fill="outline">
            <ion-select-option v-for="f in fincas" :key="f.id" :value="f.id">{{ f.nombre }}</ion-select-option>
          </ion-select>
        </div>

        <div class="form-group">
          <label class="form-label">{{ t('home.ganadero.breedLabel') }}</label>
          <ion-select v-model="form.raza" class="form-select" fill="outline">
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
          <ion-select v-model="form.estado_comercial_id" class="form-select" fill="outline">
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
.searchbar { padding: 8px 4px 0; }
.lista { padding: 8px; }

.animal-item {
  margin-bottom: 8px;
  border-radius: 12px;
  --background: var(--bov-surface);
  box-shadow: 0 2px 8px var(--bov-shadow);
  --padding-top: 10px;
  --padding-bottom: 10px;
}

.item-seleccionado {
  --background: var(--bov-success-soft-bg);
}

.animal-icon { font-size: 28px; color: var(--ion-color-medium); }
.animal-arete { font-weight: 700; font-size: 1rem; color: var(--bov-text-strong); }
.animal-nombre { font-size: 0.85rem; color: var(--ion-color-medium); margin-top: 2px; }
.animal-finca { font-size: 0.78rem; color: var(--ion-color-primary); margin-top: 2px; }
.empty-state { text-align: center; padding: 48px 16px; color: var(--ion-color-medium); }
.empty-icon { font-size: 48px; margin-bottom: 12px; }

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
  background: var(--bov-surface);
  border-top: 1px solid var(--ion-color-light-shade);
}

.modal-content { --padding-top: 16px; }
.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 0.9rem; font-weight: 600; color: var(--bov-text-strong); margin-bottom: 6px; }
.form-input, .form-select { --border-radius: 10px; width: 100%; }
.modal-actions { display: flex; flex-direction: column; gap: 8px; margin-top: 24px; }
ion-button { --border-radius: 10px; }
</style>
