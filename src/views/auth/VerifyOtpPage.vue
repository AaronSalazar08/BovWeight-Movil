<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button fill="clear" @click="router.back()">
            <ion-icon :icon="arrowBackOutline" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ t('auth.verifyOtp.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="otp-content">
      <div class="otp-wrapper">
        <div class="page-header">
          <div class="icon-wrapper">
            <ion-icon :icon="shieldCheckmarkOutline" class="header-icon" />
          </div>
          <h2>{{ t('auth.verifyOtp.title') }}</h2>
          <p>
            {{ t('auth.verifyOtp.description', { email: correoEnmascarado, time: tiempoFormateado }) }}
          </p>
        </div>

        <form @submit.prevent="verificar" novalidate>
          <div class="field-group">
            <ion-input
              v-model="codigo"
              type="tel"
              inputmode="numeric"
              :maxlength="6"
              :label="t('auth.verifyOtp.codeLabel')"
              label-placement="floating"
              fill="outline"
              placeholder="000000"
              class="codigo-input"
              :disabled="expirado"
            />
          </div>

          <div v-if="submitError" class="alert-error">
            <ion-icon :icon="alertCircleOutline" />
            <span>{{ submitError }}</span>
          </div>

          <div v-if="expirado" class="alert-warning">
            <ion-icon :icon="timeOutline" />
            <span>{{ t('auth.verifyOtp.expired') }}</span>
          </div>

          <ion-button
            type="submit"
            expand="block"
            :disabled="isVerifying || expirado || codigo.length !== 6"
            class="submit-btn"
          >
            <ion-spinner v-if="isVerifying" name="crescent" slot="start" />
            {{ isVerifying ? t('auth.verifyOtp.verifying') : t('auth.verifyOtp.verify') }}
          </ion-button>

          <ion-button
            fill="clear"
            expand="block"
            :disabled="resendCooldown > 0 || isResending"
            @click="reenviar"
            class="resend-btn"
          >
            {{ resendCooldown > 0 ? t('auth.verifyOtp.resendIn', { seconds: resendCooldown }) : t('auth.verifyOtp.resend') }}
          </ion-button>
        </form>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
  IonInput, IonIcon, IonSpinner,
} from '@ionic/vue'
import { shieldCheckmarkOutline, alertCircleOutline, timeOutline, arrowBackOutline } from 'ionicons/icons'
import { authApi } from '@/api/auth'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const correo = (route.query.correo as string) ?? ''
const codigo = ref('')
const isVerifying = ref(false)
const isResending = ref(false)
const submitError = ref('')
const resendCooldown = ref(60)
const secondsLeft = ref(120)
let cooldownTimer: ReturnType<typeof setInterval> | null = null
let expiryTimer: ReturnType<typeof setInterval> | null = null

const correoEnmascarado = computed(() => {
  const [usuario, dominio] = correo.split('@')
  if (!usuario || !dominio) return correo
  const visible = usuario.slice(0, 2)
  return `${visible}${'*'.repeat(Math.max(usuario.length - 2, 1))}@${dominio}`
})

const expirado = computed(() => secondsLeft.value <= 0)

const tiempoFormateado = computed(() => {
  const m = Math.floor(secondsLeft.value / 60)
  const s = secondsLeft.value % 60
  return `${m}:${s.toString().padStart(2, '0')}`
})

function limpiarTimers() {
  if (cooldownTimer) clearInterval(cooldownTimer)
  if (expiryTimer) clearInterval(expiryTimer)
}

function iniciarTimers() {
  limpiarTimers()
  resendCooldown.value = 60
  secondsLeft.value = 120
  cooldownTimer = setInterval(() => {
    if (resendCooldown.value > 0) resendCooldown.value--
  }, 1000)
  expiryTimer = setInterval(() => {
    if (secondsLeft.value > 0) secondsLeft.value--
  }, 1000)
}

async function reenviar() {
  if (resendCooldown.value > 0 || !correo) return
  isResending.value = true
  submitError.value = ''
  try {
    await authApi.sendOtp(correo)
    codigo.value = ''
    iniciarTimers()
  } catch {
    submitError.value = t('auth.verifyOtp.resendError')
  } finally {
    isResending.value = false
  }
}

async function verificar() {
  if (codigo.value.length !== 6 || !correo || expirado.value) return
  isVerifying.value = true
  submitError.value = ''
  try {
    const { data } = await authApi.verifyOtp(correo, codigo.value)
    // ResetPasswordPage.vue (vista existente, reutilizada) espera el query param "email", no "correo".
    router.replace({ name: 'ResetPassword', query: { token: data.token, email: correo } })
  } catch (e: any) {
    submitError.value = e?.response?.data?.message ?? t('auth.verifyOtp.genericError')
  } finally {
    isVerifying.value = false
  }
}

onMounted(() => {
  if (!correo) {
    router.replace({ name: 'ForgotPassword' })
    return
  }
  iniciarTimers()
})

onUnmounted(limpiarTimers)
</script>

<style scoped>
.otp-content {
  --background: #f5f7fa;
}

.otp-wrapper {
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

.codigo-input {
  text-align: center;
  font-size: 22px;
  letter-spacing: 6px;
}

.alert-error,
.alert-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 16px;
  font-size: 14px;
}

.alert-error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: var(--ion-color-danger);
}

.alert-warning {
  background: #fff8e1;
  border: 1px solid #ffe082;
  color: #795548;
}

.submit-btn {
  margin-top: 8px;
  --border-radius: 10px;
  height: 48px;
  font-weight: 600;
}

.resend-btn {
  margin-top: 8px;
  font-size: 14px;
}
</style>
