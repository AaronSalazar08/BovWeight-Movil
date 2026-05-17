<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/login" text="" />
        </ion-buttons>
        <ion-title>Recuperar contraseña</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="forgot-content">
      <div class="forgot-wrapper">
        <div v-if="!sent">
          <div class="page-header">
            <div class="icon-wrapper">
              <ion-icon :icon="lockClosedOutline" class="header-icon" />
            </div>
            <h2>¿Olvidaste tu contraseña?</h2>
            <p>
              Ingresa tu correo electrónico y te enviaremos un enlace para
              restablecer tu contraseña.
            </p>
          </div>

          <form @submit.prevent="handleSubmit" novalidate>
            <div class="field-group">
              <ion-input
                v-model="correo"
                type="email"
                label="Correo electrónico"
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
              {{ isLoading ? 'Enviando...' : 'Enviar enlace' }}
            </ion-button>
          </form>
        </div>

        <!-- Estado: correo enviado -->
        <div v-else class="sent-state">
          <div class="sent-icon-wrapper">
            <ion-icon :icon="mailOutline" class="sent-icon" />
          </div>
          <h2>Revisa tu correo</h2>
          <p>
            Si el correo <strong>{{ correo }}</strong> está registrado en el sistema,
            recibirás un enlace de recuperación. El enlace expira en 30 minutos.
          </p>
          <ion-button expand="block" router-link="/login" replace class="submit-btn">
            Volver al inicio de sesión
          </ion-button>
          <ion-button
            fill="clear"
            expand="block"
            :disabled="resendCooldown > 0"
            @click="handleSubmit"
            class="resend-btn"
          >
            {{ resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : 'Reenviar enlace' }}
          </ion-button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonInput, IonButton, IonIcon, IonSpinner,
} from '@ionic/vue'
import { lockClosedOutline, mailOutline, alertCircleOutline } from 'ionicons/icons'
import { authApi } from '@/api/auth'

const correo = ref('')
const correoError = ref('')
const submitError = ref('')
const isLoading = ref(false)
const sent = ref(false)
const resendCooldown = ref(0)

let cooldownTimer: ReturnType<typeof setInterval> | null = null

function validateCorreo(): boolean {
  correoError.value = ''
  if (!correo.value) {
    correoError.value = 'El correo electrónico es requerido.'
    return false
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.value)) {
    correoError.value = 'Ingresa un correo electrónico válido.'
    return false
  }
  return true
}

function startCooldown() {
  resendCooldown.value = 60
  cooldownTimer = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0 && cooldownTimer) {
      clearInterval(cooldownTimer)
      cooldownTimer = null
    }
  }, 1000)
}

async function handleSubmit() {
  if (!validateCorreo()) return

  isLoading.value = true
  submitError.value = ''

  try {
    await authApi.forgotPassword(correo.value.trim())
    sent.value = true
    startCooldown()
  } catch {
    // Mostramos mensaje neutro para no revelar si el correo existe
    sent.value = true
    startCooldown()
  } finally {
    isLoading.value = false
  }
}

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer)
})
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

/* Estado enviado */
.sent-state {
  text-align: center;
}

.sent-icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #e8f5e9;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
}

.sent-icon {
  font-size: 40px;
  color: var(--ion-color-primary);
}

.sent-state h2 {
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 12px;
}

.sent-state p {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin: 0 0 28px;
}

.resend-btn {
  margin-top: 8px;
  font-size: 14px;
}

ion-input.input-error {
  --highlight-color-focused: var(--ion-color-danger);
  --border-color: var(--ion-color-danger);
}
</style>
