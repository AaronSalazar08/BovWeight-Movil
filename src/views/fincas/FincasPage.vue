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
import { useEstimacionPendienteStore } from '@/stores/estimacionPendiente'
import { useToast } from '@/composables/useToast'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const authStore = useAuthStore()
const estimacionPendienteStore = useEstimacionPendienteStore()
const { info, error: toastError } = useToast()
const { t } = useI18n()
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

    loadError.value = t('fincas.loadError')

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

  } catch (error: any) {

    console.error(error)

    toastError(error?.response?.data?.message ?? t('fincas.saveFarmErrorDefault'))

  }

}

async function eliminarFinca(id: number) {
  if (!canManageFincas.value) return

  const alert = await alertController.create({

    header: t('fincas.deleteFarmTitle'),

    message: t('fincas.deleteFarmMessage'),

    cssClass: 'bov-alert',

    buttons: [

      {
        text: t('common.cancel'),
        role: 'cancel',
      },

      {
        text: t('fincas.delete'),
        role: 'destructive',

        handler: async () => {

          try {

            await deleteFinca(id)

            await loadFincas()

          } catch (error: any) {

            console.error(error)

            const status = error?.response?.status

            const message = status === 400
              ? t('fincas.deleteFarmHasAnimals')
              : (error?.response?.data?.message ?? t('fincas.deleteFarmErrorDefault'))

            toastError(message)

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
    vetError.value = t('fincas.vetEmailRequired')
    return
  }
  vetLoading.value = true
  vetError.value = ''
  try {
    await solicitudesVetApi.create(vetForm)
    showVetModal.value = false
    const alert = await alertController.create({
      header: t('fincas.vetRequestSentTitle'),
      message: t('fincas.vetRequestSentMessage'),
      buttons: ['OK'],
    })
    await alert.present()
  } catch (error: any) {
    vetError.value = error?.response?.data?.message ?? t('fincas.vetRequestErrorDefault')
  } finally {
    vetLoading.value = false
  }
}

async function openOptions(finca: Finca) {
  const buttons: any[] = []

  if (canManageFincas.value) {
    buttons.push(
      {
        text: t('fincas.edit'),
        handler: () => { editarFinca(finca) },
      },
      {
        text: t('fincas.delete'),
        role: 'destructive',
        handler: () => { eliminarFinca(finca.id) },
      },
    )
  }

  if (authStore.isGanadero) {
    buttons.push({
      text: t('fincas.requestVet'),
      handler: () => { abrirModalVet(finca) },
    })
  }

  buttons.push({ text: t('common.cancel'), role: 'cancel' })

  const actionSheet = await actionSheetController.create({
    header: finca.nombre,
    cssClass: 'bov-action-sheet',
    buttons,
  })

  await actionSheet.present()
}

onMounted(() => {

  loadFincas()

  if (estimacionPendienteStore.hayPendiente) {
    info(t('fincas.pendingEstimationToast'))
  }

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
          {{ t('fincas.title') }}
        </ion-title>

      </ion-toolbar>

    </ion-header>

    <ion-content class="ion-padding fincas-content">

      <!-- BUSCADOR -->

      <ion-searchbar
        v-model="search"
        :placeholder="t('fincas.searchPlaceholder')"
        class="searchbar"
      />



      <!-- LISTA -->

      <div v-if="loadError" class="error-state">
        <ion-icon :icon="homeOutline" class="empty-icon" />
        <p>{{ loadError }}</p>
        <ion-button size="small" @click="retryLoadFincas">
          {{ t('fincas.retry') }}
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
            <div class="item-meta">{{ finca.ubicacion || t('fincas.locationUndefined') }}</div>
          </ion-label>

          <ion-button
            slot="end"
            size="small"
            color="success"
            @click="seleccionarFinca(finca)"
            class="select-btn"
          >
            {{ t('fincas.select') }}
          </ion-button>

          <ion-button
            v-if="canManageFincas || authStore.isGanadero"
            slot="end"
            fill="clear"
            @click="openOptions(finca)"
            :aria-label="t('fincas.moreOptions')"
          >
            <ion-icon :icon="ellipsisVertical" />
          </ion-button>

        </ion-item>

      </ion-list>

      <div v-else-if="!loading" class="empty-state">
        <ion-icon :icon="homeOutline" class="empty-icon" />
        <p>{{ t('fincas.emptyTitle') }}</p>
        <p class="empty-note">{{ t('fincas.emptyNote') }}</p>
      </div>

      <div v-else class="empty-state">
        <ion-icon :icon="homeOutline" class="empty-icon" />
        <p>{{ t('fincas.loading') }}</p>
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
            <ion-title>{{ t('fincas.requestVet') }}</ion-title>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding modal-content">

          <p style="color: var(--ion-color-medium); font-size: 0.9rem; padding-bottom: 8px">
            {{ t('fincas.vetFarmLabel') }} <strong>{{ fincaParaVet?.nombre }}</strong>
          </p>

          <ion-item>
            <ion-label position="stacked">{{ t('fincas.vetEmailLabel') }}</ion-label>
            <ion-input
              v-model="vetForm.correo_veterinario"
              type="email"
              :placeholder="t('fincas.vetEmailPlaceholder')"
            />
          </ion-item>

          <p v-if="vetError" style="color: var(--ion-color-danger); font-size: 0.85rem; padding: 8px 16px 0">
            {{ vetError }}
          </p>

          <ion-button expand="block" class="ion-margin-top" :disabled="vetLoading" @click="enviarSolicitudVet">
            <span v-if="vetLoading">{{ t('fincas.sending') }}</span>
            <span v-else>{{ t('fincas.sendRequest') }}</span>
          </ion-button>

          <ion-button expand="block" fill="outline" @click="showVetModal = false">
            {{ t('common.cancel') }}
          </ion-button>

        </ion-content>

      </ion-modal>

      <!-- MODAL CREAR / EDITAR FINCA -->

      <ion-modal :is-open="showModal">

        <ion-header>

          <ion-toolbar color="primary">

            <ion-title>

              {{ editMode ? t('fincas.editFarm') : t('fincas.newFarm') }}

            </ion-title>

          </ion-toolbar>

        </ion-header>

        <ion-content class="ion-padding modal-content">

          <ion-item>

            <ion-label position="stacked">
              {{ t('fincas.nameLabel') }}
            </ion-label>

            <ion-input
              v-model="form.nombre"
              :placeholder="t('fincas.namePlaceholder')"
            />

          </ion-item>

          <ion-item>

            <ion-label position="stacked">
              {{ t('fincas.locationLabel') }}
            </ion-label>

            <ion-input
              v-model="form.ubicacion"
              :placeholder="t('fincas.locationPlaceholder')"
            />

          </ion-item>

          <ion-item>

            <ion-label position="stacked">
              {{ t('fincas.areaLabel') }}
            </ion-label>

            <ion-input
              type="number"
              v-model="form.area"
              :placeholder="t('fincas.areaPlaceholder')"
            />

          </ion-item>

          <ion-item>

            <ion-label position="stacked">
              {{ t('fincas.farmNumberLabel') }}
            </ion-label>

            <ion-input
              v-model="form.numero_finca"
              :placeholder="t('fincas.farmNumberPlaceholder')"
            />

          </ion-item>

          <ion-button
            expand="block"
            @click="saveFinca"
          >

            {{ editMode ? t('fincas.update') : t('fincas.save') }}

          </ion-button>

          <ion-button
            expand="block"
            fill="outline"
            @click="closeModal"
          >

            {{ t('common.cancel') }}

          </ion-button>

        </ion-content>

      </ion-modal>

    </ion-content>

  </ion-page>

</template>

<style scoped>
.fincas-content {
  --background: var(--ion-background-color);
}

.modal-content {
  --background: var(--bov-surface);
  --color: var(--bov-text-strong);
  --ion-item-background: var(--bov-surface);
}
</style><style scoped>
/* Fondo del contenedor de la lista igual al fondo de página, para que no
   aparezcan barras de otro color entre los items "inset". */
ion-list {
  background: var(--ion-background-color);
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
  --background: var(--bov-surface);
  --color: var(--bov-text-strong);
  --icon-color: var(--bov-text-muted);
  --placeholder-color: #9e9e9e;
  --border-radius: 10px;
  --padding-start: 6px;
  --padding-end: 6px;
  margin-bottom: 8px;
}

.finca-item {
  margin-bottom: 12px;
  border-radius: 12px;
  --background: var(--bov-surface);
  box-shadow: 0 6px 18px var(--bov-shadow);
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

