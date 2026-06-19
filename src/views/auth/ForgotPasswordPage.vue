<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/login" text="" />
        </ion-buttons>
        <ion-title>{{ t('auth.forgotPassword.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="forgot-content">
      <div class="forgot-wrapper">
        <div class="page-header">
          <div class="icon-wrapper">
            <ion-icon :icon="lockClosedOutline" class="header-icon" />
          </div>
          <h2>{{ t('auth.forgotPassword.title') }}</h2>
          <p>{{ t('auth.forgotPassword.description') }}</p>
        </div>

        <form @submit.prevent="handleSubmit" novalidate>
          <div class="field-group">
            <ion-input
              v-model="correo"
              type="email"
              :label="t('auth.forgotPassword.emailLabel')"
              label-placement="floating"
              fill="outline"
              placeholder="usuario@ejemplo.com"
              autocomplete="email"
              :class="{ 'input-error': correoError }"
              @ion-blur="validateCorreo"
            />
            <p v-if="correoError" class="error-text">{{ correoError }}</p>
          </div>

          <div v-if="submitError" class="alert-error">
            <ion-icon :icon="alertCircleOutline" />
            <span>{{ submitError }}</span>
          </div>

          <ion-button
            type="submit"
            expand="block"
            :disabled="isLoading"
            class="submit-btn"
          >
            <ion-spinner v-if="isLoading" name="crescent" slot="start" />
            {{ isLoading ? t('auth.forgotPassword.submitting') : t('auth.forgotPassword.submit') }}
          </ion-button>
        </form>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonInput, IonButton, IonIcon, IonSpinner,
} from '@ionic/vue'
import { lockClosedOutline, alertCircleOutline } from 'ionicons/icons'
import { authApi } from '@/api/auth'

const router = useRouter()
const { t } = useI18n()

const correo = ref('')
const correoError = ref('')
const submitError = ref('')
const isLoading = ref(false)

function validateCorreo(): boolean {
  correoError.value = ''
  if (!correo.value) {
    correoError.value = t('auth.forgotPassword.emailRequired')
    return false
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.value)) {
    correoError.value = t('auth.forgotPassword.emailInvalid')
    return false
  }
  return true
}

async function handleSubmit() {
  if (!validateCorreo()) return

  isLoading.value = true
  submitError.value = ''

  const correoEnviado = correo.value.trim()

  try {
    await authApi.sendOtp(correoEnviado)
  } catch {
    // Mensaje neutro: no revelamos si el correo existe (decisión de seguridad).
  } finally {
    isLoading.value = false
    router.push({ name: 'VerifyOtp', query: { correo: correoEnviado } })
  }
}
</script>

<style scoped>
.forgot-content {
  --background: #f5f7fa;
}

.forgot-wrapper {
  padding: 32px 20px;
  max-width: 480px;
  margin: 0 auto;
  color: #1a1a1a;
  --ion-text-color: #1a1a1a;
  --color: #1a1a1a;
}

.page-header {
  text-align: center;
  margin-bottom: 32px;
}

.icon-wrapper {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: #e8f5e9;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

.header-icon {
  font-size: 36px;
  color: var(--ion-color-primary);
}

.page-header h2 {
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 10px;
}

.page-header p {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin: 0;
}

.field-group {
  margin-bottom: 16px;
}

.error-text {
  font-size: 12px;
  color: var(--ion-color-danger);
  margin: 4px 0 0 4px;
}

.alert-error {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 16px;
  color: var(--ion-color-danger);
  font-size: 14px;
}

.submit-btn {
  margin-top: 8px;
  --border-radius: 10px;
  height: 48px;
  font-weight: 600;
}

ion-input.input-error {
  --highlight-color-focused: var(--ion-color-danger);
  --border-color: var(--ion-color-danger);
}
</style>
