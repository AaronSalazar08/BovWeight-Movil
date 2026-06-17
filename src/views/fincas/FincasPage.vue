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
  IonButtons,
  IonBackButton,
  alertController,
  actionSheetController,
} from '@ionic/vue'

import {
  homeOutline,
  addOutline,
  ellipsisVertical,
} from 'ionicons/icons'

import {
  onMounted,
  ref,
  computed,
  reactive,
} from 'vue'

import {
  getFincas,
  createFinca,
  updateFinca,
  deleteFinca,
  type Finca,
} from '@/api/fincas'

import { solicitudesVetApi, type SolicitudVeterinarioPayload } from '@/api/solicitudesVet'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const router = useRouter()
const authStore = useAuthStore()
const canManageFincas = computed(() => !authStore.isVeterinario)

const fincas = ref<Finca[]>([])

const search = ref('')

const loading = ref(false)

const loadError = ref('')

const showModal = ref(false)

const editMode = ref(false)

const fincaActual = ref<Finca | null>(null)

const form = reactive({
  usuario_id: 0,
  nombre: '',
  ubicacion: '',
  area: 0,
  numero_finca: '',
})

const showVetModal = ref(false)
const fincaParaVet = ref<Finca | null>(null)
const vetForm = reactive<SolicitudVeterinarioPayload>({
  finca_id: 0,
  correo_veterinario: '',
})
const vetError = ref('')
const vetLoading = ref(false)

const loadFincas = async () => {

  loading.value = true
  loadError.value = ''

  try {

    fincas.value = await getFincas()

  } catch (error) {

    console.error(error)

    loadError.value = 'No fue posible cargar las fincas. Revisa el servidor.'

    fincas.value = []

  } finally {

    loading.value = false

  }

}

const filteredFincas = computed(() => {

  return fincas.value.filter((finca) =>
    finca.nombre.toLowerCase()
      .includes(search.value.toLowerCase())
  )

})

const hasFincas = computed(() => filteredFincas.value.length > 0)

function seleccionarFinca(finca: Finca) {
  router.push(`/tabs/fincas/${finca.id}/animales`)
}

function openModal() {
  if (!canManageFincas.value) return

  editMode.value = false

  fincaActual.value = null

  form.nombre = ''
  form.ubicacion = ''
  form.area = 0
  form.numero_finca = ''

  showModal.value = true

}

function retryLoadFincas() {

  loadFincas()

}

function closeModal() {

  showModal.value = false

}

function editarFinca(finca: Finca) {
  if (!canManageFincas.value) return

  editMode.value = true

  fincaActual.value = finca

  form.nombre = finca.nombre
  form.ubicacion = finca.ubicacion
  form.area = finca.area
  form.numero_finca = finca.numero_finca

  showModal.value = true

}

async function saveFinca() {
  if (!canManageFincas.value) return

  try {

    form.usuario_id = authStore.user!.id

    if (editMode.value && fincaActual.value) {

      await updateFinca(fincaActual.value.id, form)

    } else {

      await createFinca(form)

    }

    closeModal()

    await loadFincas()

  } catch (error) {

    console.error(error)

  }

}

async function eliminarFinca(id: number) {
  if (!canManageFincas.value) return

  const alert = await alertController.create({

    header: 'Eliminar finca',

    message: '¿Desea eliminar esta finca?',

    cssClass: 'bov-alert',

    buttons: [

      {
        text: 'Cancelar',
        role: 'cancel',
      },

      {
        text: 'Eliminar',
        role: 'destructive',

        handler: async () => {

          try {

            await deleteFinca(id)

            await loadFincas()

          } catch (error) {

            console.error(error)

          }

        },

      },

    ],

  })

  await alert.present()

}

function abrirModalVet(finca: Finca) {
  fincaParaVet.value = finca
  vetForm.finca_id = finca.id
  vetForm.correo_veterinario = ''
  vetError.value = ''
  showVetModal.value = true
}

async function enviarSolicitudVet() {
  if (!vetForm.correo_veterinario) {
    vetError.value = 'El correo del veterinario es requerido.'
    return
  }
  vetLoading.value = true
  vetError.value = ''
  try {
    await solicitudesVetApi.create(vetForm)
    showVetModal.value = false
    const alert = await alertController.create({
      header: 'Solicitud enviada',
      message: 'Tu solicitud de veterinario fue enviada al administrador.',
      buttons: ['OK'],
    })
    await alert.present()
  } catch (error: any) {
    vetError.value = error?.response?.data?.message ?? 'Error al enviar la solicitud.'
  } finally {
    vetLoading.value = false
  }
}

async function openOptions(finca: Finca) {
  const buttons: any[] = []

  if (canManageFincas.value) {
    buttons.push(
      {
        text: 'Editar',
        handler: () => { editarFinca(finca) },
      },
      {
        text: 'Eliminar',
        role: 'destructive',
        handler: () => { eliminarFinca(finca.id) },
      },
    )
  }

  if (authStore.isGanadero) {
    buttons.push({
      text: 'Solicitar Veterinario',
      handler: () => { abrirModalVet(finca) },
    })
  }

  buttons.push({ text: 'Cancelar', role: 'cancel' })

  const actionSheet = await actionSheetController.create({
    header: finca.nombre,
    cssClass: 'bov-action-sheet',
    buttons,
  })

  await actionSheet.present()
}

onMounted(() => {

  loadFincas()

})

</script>

<template>

  <ion-page>

    <ion-header>

      <ion-toolbar color="primary">

        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/home" />
        </ion-buttons>

        <ion-title>
          Fincas
        </ion-title>

      </ion-toolbar>

    </ion-header>

    <ion-content class="ion-padding fincas-content">

      <!-- BUSCADOR -->

      <ion-searchbar
        v-model="search"
        placeholder="Buscar finca"
        class="searchbar"
      />

      

      <!-- LISTA -->

      <div v-if="loadError" class="error-state">
        <ion-icon :icon="homeOutline" class="empty-icon" />
        <p>{{ loadError }}</p>
        <ion-button size="small" @click="retryLoadFincas">
          Reintentar
        </ion-button>
      </div>

      <ion-list v-else-if="hasFincas">

        <ion-item
          v-for="finca in filteredFincas"
          :key="finca.id"
          class="finca-item"
        >

          <ion-icon
            :icon="homeOutline"
            slot="start"
            class="item-icon"
          />

          <ion-label>
            <div class="item-title">{{ finca.nombre }}</div>
            <div class="item-meta">{{ finca.ubicacion || 'Ubicación no definida' }}</div>
          </ion-label>

          <ion-button
            slot="end"
            size="small"
            color="success"
            @click="seleccionarFinca(finca)"
            class="select-btn"
          >
            Seleccionar
          </ion-button>

          <ion-button
            v-if="canManageFincas || authStore.isGanadero"
            slot="end"
            fill="clear"
            @click="openOptions(finca)"
            aria-label="Más opciones"
          >
            <ion-icon :icon="ellipsisVertical" />
          </ion-button>

        </ion-item>

      </ion-list>

      <div v-else-if="!loading" class="empty-state">
        <ion-icon :icon="homeOutline" class="empty-icon" />
        <p>No se encontraron fincas.</p>
        <p class="empty-note">Pulsa el botón + para agregar una nueva finca.</p>
      </div>

      <div v-else class="empty-state">
        <ion-icon :icon="homeOutline" class="empty-icon" />
        <p>Cargando fincas...</p>
      </div>

      <!-- FAB -->

      <ion-fab
        v-if="canManageFincas"
        vertical="bottom"
        horizontal="end"
        slot="fixed"
      >

        <ion-fab-button @click="openModal">

          <ion-icon :icon="addOutline" />

        </ion-fab-button>

      </ion-fab>

      <!-- MODAL SOLICITUD DE VETERINARIO -->

      <ion-modal :is-open="showVetModal">

        <ion-header>
          <ion-toolbar color="primary">
            <ion-title>Solicitar Veterinario</ion-title>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding modal-content">

          <p style="color: var(--ion-color-medium); font-size: 0.9rem; padding-bottom: 8px">
            Finca: <strong>{{ fincaParaVet?.nombre }}</strong>
          </p>

          <ion-item>
            <ion-label position="stacked">Correo del veterinario *</ion-label>
            <ion-input
              v-model="vetForm.correo_veterinario"
              type="email"
              placeholder="correo@ejemplo.com"
            />
          </ion-item>

          <p v-if="vetError" style="color: var(--ion-color-danger); font-size: 0.85rem; padding: 8px 16px 0">
            {{ vetError }}
          </p>

          <ion-button expand="block" class="ion-margin-top" :disabled="vetLoading" @click="enviarSolicitudVet">
            <span v-if="vetLoading">Enviando...</span>
            <span v-else>Enviar Solicitud</span>
          </ion-button>

          <ion-button expand="block" fill="outline" @click="showVetModal = false">
            Cancelar
          </ion-button>

        </ion-content>

      </ion-modal>

      <!-- MODAL CREAR / EDITAR FINCA -->

      <ion-modal :is-open="showModal">

        <ion-header>

          <ion-toolbar color="primary">

            <ion-title>

              {{ editMode ? 'Editar Finca' : 'Nueva Finca' }}

            </ion-title>

          </ion-toolbar>

        </ion-header>

        <ion-content class="ion-padding modal-content">

          <ion-item>

            <ion-label position="stacked">
              Nombre
            </ion-label>

            <ion-input
              v-model="form.nombre"
            />

          </ion-item>

          <ion-item>

            <ion-label position="stacked">
              Ubicación
            </ion-label>

            <ion-input
              v-model="form.ubicacion"
            />

          </ion-item>

          <ion-item>

            <ion-label position="stacked">
              Área
            </ion-label>

            <ion-input
              type="number"
              v-model="form.area"
            />

          </ion-item>

          <ion-item>

            <ion-label position="stacked">
              Número finca
            </ion-label>

            <ion-input
              v-model="form.numero_finca"
            />

          </ion-item>

          <ion-button
            expand="block"
            @click="saveFinca"
          >

            {{ editMode ? 'Actualizar' : 'Guardar' }}

          </ion-button>

          <ion-button
            expand="block"
            fill="outline"
            @click="closeModal"
          >

            Cancelar

          </ion-button>

        </ion-content>

      </ion-modal>

    </ion-content>

  </ion-page>

</template>

<style scoped>
.fincas-content {
  --background: #f0f4f8;
}

.modal-content {
  --background: #ffffff;
  --color: #1a1a1a;
  --ion-item-background: #ffffff;
}
</style><style scoped>
/* Fuerza fondo claro en el contenedor de la lista para que no aparezcan
   barras negras entre los items cuando el sistema está en modo oscuro. */
ion-list {
  background: #f0f4f8;
}

.list-header {
  margin: 10px 0 8px;
}

.page-subtitle {
  margin: 0;
  color: var(--ion-color-medium);
  font-size: 0.95rem;
  line-height: 1.3;
}

.searchbar {
  --background: #ffffff;
  --color: #1a1a1a;
  --icon-color: #555555;
  --placeholder-color: #9e9e9e;
  --border-radius: 10px;
  --padding-start: 6px;
  --padding-end: 6px;
  margin-bottom: 8px;
}

.finca-item {
  margin-bottom: 12px;
  border-radius: 12px;
  --background: #fbfbfb;
  box-shadow: 0 6px 18px rgba(17,17,17,0.04);
  --padding-top: 10px;
  --padding-bottom: 10px;
  align-items: center;
}

.item-icon {
  font-size: 22px;
  color: var(--ion-color-primary-shade, #277a3a);
}

.item-title {
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: 2px;
}

.item-meta {
  font-size: 0.85rem;
  color: var(--ion-color-medium);
}

.select-btn {
  margin-right: 6px;
}

.empty-state {
  text-align: center;
  padding: 28px 12px;
  color: var(--ion-color-medium);
}

.empty-icon {
  font-size: 40px;
  color: var(--ion-color-primary-shade, #277a3a);
  margin-bottom: 8px;
}

.empty-note {
  font-size: 0.9rem;
  margin-top: 6px;
  color: var(--ion-color-medium);
}

ion-button {
  --border-radius: 10px;
}

</style>

