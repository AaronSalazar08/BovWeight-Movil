<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar color="primary">
        <ion-title>{{ t('auth.resetPassword.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="reset-content">
      <div class="reset-wrapper">
        <div v-if="!resetDone">
          <div class="page-header">
            <div class="icon-wrapper">
              <ion-icon :icon="keyOutline" class="header-icon" />
            </div>
            <h2>{{ t('auth.resetPassword.title') }}</h2>
            <p>{{ t('auth.resetPassword.description') }}</p>
          </div>

          <div v-if="!token" class="alert-error">
            <ion-icon :icon="alertCircleOutline" />
            <span>{{ t('auth.resetPassword.invalidLink') }}</span>
          </div>

          <form v-else @submit.prevent="handleReset" novalidate>
            <div class="field-group">
              <ion-input
                v-model="form.contrasena"
                :type="showPassword ? 'text' : 'password'"
                :label="t('auth.resetPassword.newPasswordLabel')"
                label-placement="floating"
                fill="outline"
                placeholder="••••••••"
                :class="{ 'input-error': errors.contrasena }"
                @ion-blur="validateContrasena"
              >
                <ion-button slot="end" fill="clear" size="small" @click="showPassword = !showPassword">
                  <ion-icon :icon="showPassword ? eyeOffOutline : eyeOutline" />
                </ion-button>
              </ion-input>
              <p v-if="errors.contrasena" class="error-text">{{ errors.contrasena }}</p>
            </div>

            <div class="field-group">
              <ion-input
                v-model="form.confirmacion"
                :type="showConfirm ? 'text' : 'password'"
                :label="t('auth.resetPassword.confirmPasswordLabel')"
                label-placement="floating"
                fill="outline"
                placeholder="••••••••"
                :class="{ 'input-error': errors.confirmacion }"
                @ion-blur="validateConfirmacion"
              >
                <ion-button slot="end" fill="clear" size="small" @click="showConfirm = !showConfirm">
                  <ion-icon :icon="showConfirm ? eyeOffOutline : eyeOutline" />
                </ion-button>
              </ion-input>
              <p v-if="errors.confirmacion" class="error-text">{{ errors.confirmacion }}</p>
            </div>

            <!-- Indicador de fortaleza -->
            <div class="strength-wrapper">
              <div
                v-for="i in 4"
                :key="i"
                class="strength-bar"
                :class="{ active: passwordStrength >= i, [`level-${passwordStrength}`]: true }"
              />
            </div>
            <p class="strength-label">{{ strengthLabel }}</p>

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
              {{ isLoading ? t('auth.resetPassword.submitting') : t('auth.resetPassword.submit') }}
            </ion-button>
          </form>

          <ion-button fill="clear" expand="block" router-link="/forgot-password" replace class="back-btn">
            {{ t('auth.resetPassword.requestNewLink') }}
          </ion-button>
        </div>

        <!-- Estado: éxito -->
        <div v-else class="success-state">
          <div class="success-icon-wrapper">
            <ion-icon :icon="checkmarkCircleOutline" class="success-icon" />
          </div>
          <h2>{{ t('auth.resetPassword.successTitle') }}</h2>
          <p>{{ t('auth.resetPassword.successMessage') }}</p>
          <ion-button expand="block" router-link="/login" replace class="submit-btn">
            {{ t('auth.resetPassword.goToLogin') }}
          </ion-button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonInput, IonButton, IonIcon, IonSpinner,
  onIonViewWillEnter,
} from '@ionic/vue'
import {
  keyOutline, eyeOutline, eyeOffOutline, alertCircleOutline, checkmarkCircleOutline,
} from 'ionicons/icons'
import { authApi } from '@/api/auth'

const route = useRoute()
const { t } = useI18n()

const token = computed(() => (route.query.token as string) ?? '')
const correo = computed(() => (route.query.email as string) ?? '')

const form = reactive({ contrasena: '', confirmacion: '' })
const errors = reactive({ contrasena: '', confirmacion: '' })
const isLoading = ref(false)
const submitError = ref('')
const resetDone = ref(false)
const showPassword = ref(false)
const showConfirm = ref(false)

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/

const passwordStrength = computed(() => {
  const p = form.contrasena
  if (!p) return 0
  let score = 0
  if (p.length >= 8) score++
  if (/[A-Z]/.test(p)) score++
  if (/\d/.test(p)) score++
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p)) score++
  return score
})

const strengthLabel = computed(() => {
  const labels = ['', t('auth.resetPassword.strength1'), t('auth.resetPassword.strength2'), t('auth.resetPassword.strength3'), t('auth.resetPassword.strength4')]
  return labels[passwordStrength.value]
})

function validateContrasena(): boolean {
  errors.contrasena = ''
  if (!form.contrasena) {
    errors.contrasena = t('auth.resetPassword.passwordRequired')
    return false
  }
  if (!PASSWORD_REGEX.test(form.contrasena)) {
    errors.contrasena = t('auth.resetPassword.passwordInvalid')
    return false
  }
  return true
}

function validateConfirmacion(): boolean {
  errors.confirmacion = ''
  if (!form.confirmacion) {
    errors.confirmacion = t('auth.resetPassword.confirmRequired')
    return false
  }
  if (form.contrasena !== form.confirmacion) {
    errors.confirmacion = t('auth.resetPassword.confirmMismatch')
    return false
  }
  return true
}

// Ionic mantiene en caché las páginas para las transiciones (no las destruye
// al navegar), así que esta vista puede reutilizar su instancia anterior si
// se visita más de una vez en la misma sesión (ahora posible con el flujo de
// OTP). Sin este reseteo, un "resetDone" de una visita previa haría saltar
// directo a la pantalla de éxito sin pasar por el formulario.
onIonViewWillEnter(() => {
  resetDone.value = false
  form.contrasena = ''
  form.confirmacion = ''
  errors.contrasena = ''
  errors.confirmacion = ''
  submitError.value = ''
  showPassword.value = false
  showConfirm.value = false
})

async function handleReset() {
  const valid = validateContrasena() && validateConfirmacion()
  if (!valid) return
  if (!token.value || !correo.value) return

  isLoading.value = true
  submitError.value = ''

  try {
    await authApi.resetPassword({
      token: token.value,
      correo: correo.value,
      contrasena: form.contrasena,
      contrasena_confirmation: form.confirmacion,
    })
    resetDone.value = true
  } catch (err: any) {
    const status = err?.response?.status
    if (status === 422) {
      submitError.value = t('auth.resetPassword.errorExpired')
    } else {
      submitError.value = t('auth.resetPassword.errorGeneric')
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.reset-content {
  --background: #f5f7fa;
}

.reset-wrapper {
  padding: 32px 20px;
  max-width: 480px;
  margin: 0 auto;
  color: #1a1a1a;
  --ion-text-color: #1a1a1a;
  --color: #1a1a1a;
}

.page-header {
  text-align: center;
  margin-bottom: 28px;
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
  font-size: 13px;
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

.strength-wrapper {
  display: flex;
  gap: 6px;
  margin: 4px 0 4px;
}

.strength-bar {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: #e0e0e0;
  transition: background 0.3s;
}

.strength-bar.active.level-1 { background: #f44336; }
.strength-bar.active.level-2 { background: #ff9800; }
.strength-bar.active.level-3 { background: #ffc107; }
.strength-bar.active.level-4 { background: #4caf50; }

.strength-label {
  font-size: 12px;
  color: #888;
  margin: 2px 0 16px;
  text-align: right;
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

.back-btn {
  margin-top: 4px;
  font-size: 14px;
}

/* Estado éxito */
.success-state {
  text-align: center;
}

.success-icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #e8f5e9;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
}

.success-icon {
  font-size: 44px;
  color: var(--ion-color-primary);
}

.success-state h2 {
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 12px;
}

.success-state p {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin: 0 0 28px;
}

ion-input.input-error {
  --highlight-color-focused: var(--ion-color-danger);
  --border-color: var(--ion-color-danger);
}
</style>
