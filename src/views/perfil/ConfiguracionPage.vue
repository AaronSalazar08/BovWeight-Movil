<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/perfil" text="" />
        </ion-buttons>
        <ion-title>{{ t('configuracion.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="config-content">
      <ion-list inset>
        <ion-list-header>{{ t('configuracion.security') }}</ion-list-header>
        <ion-item button :disabled="enviandoOtp" @click="confirmarCambioContrasena">
          <ion-icon :icon="keyOutline" slot="start" color="primary" />
          <ion-label>{{ t('configuracion.changePassword') }}</ion-label>
          <ion-spinner v-if="enviandoOtp" slot="end" name="crescent" />
        </ion-item>
      </ion-list>

      <ion-list inset>
        <ion-list-header>{{ t('configuracion.language') }}</ion-list-header>
        <ion-item>
          <ion-icon :icon="languageOutline" slot="start" color="primary" />
          <ion-label>{{ t('configuracion.languageLabel') }}</ion-label>
          <ion-select
            slot="end"
            interface="popover"
            :value="idiomaActual"
            @ion-change="(e: CustomEvent) => cambiarIdioma(e.detail.value)"
          >
            <ion-select-option v-for="codigo in idiomasDisponibles" :key="codigo" :value="codigo">
              {{ nombresIdioma[codigo] }}
            </ion-select-option>
          </ion-select>
        </ion-item>
      </ion-list>

      <ion-list inset>
        <ion-list-header>{{ t('configuracion.theme') }}</ion-list-header>
        <ion-item>
          <ion-icon :icon="moonOutline" slot="start" color="primary" />
          <ion-label>{{ t('configuracion.themeLabel') }}</ion-label>
          <ion-toggle
            slot="end"
            :checked="esOscuro"
            @ion-change="(e: CustomEvent) => (esOscuro = e.detail.checked)"
          />
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonList, IonListHeader, IonItem, IonLabel, IonIcon, IonSpinner,
  IonSelect, IonSelectOption, IonToggle,
  alertController,
} from '@ionic/vue'
import { keyOutline, languageOutline, moonOutline } from 'ionicons/icons'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { useIdioma } from '@/composables/useIdioma'
import { useTema } from '@/composables/useTema'
import { authApi } from '@/api/auth'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()
const { t } = useI18n()
const { idiomaActual, idiomasDisponibles, nombresIdioma, cambiarIdioma } = useIdioma()
const { esOscuro } = useTema()

const enviandoOtp = ref(false)

async function confirmarCambioContrasena() {
  const correo = authStore.user?.correo
  if (!correo) return

  const alert = await alertController.create({
    header: t('configuracion.changePasswordConfirmTitle'),
    message: t('configuracion.changePasswordConfirmMessage', { email: correo }),
    buttons: [
      { text: t('common.cancel'), role: 'cancel' },
      { text: t('configuracion.sendCode'), handler: () => enviarOtp(correo) },
    ],
  })
  await alert.present()
}

async function enviarOtp(correo: string) {
  enviandoOtp.value = true
  try {
    await authApi.sendOtp(correo)
    router.push({ name: 'VerifyOtp', query: { correo } })
  } catch (e: any) {
    toast.error(e?.response?.data?.message ?? t('configuracion.errorSendOtp'))
  } finally {
    enviandoOtp.value = false
  }
}
</script>

<style scoped>
.config-content {
  --background: var(--ion-background-color);
}
</style>
