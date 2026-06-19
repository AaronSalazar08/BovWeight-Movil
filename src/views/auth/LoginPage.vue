<template>
  <ion-page>
    <ion-content :fullscreen="true" class="login-content">
      <div class="login-wrapper">
        <!-- Logo y título -->
        <div class="login-header">
          <div class="logo-circle">
            <ion-icon :icon="leafOutline" class="logo-icon" />
          </div>
          <h1 class="app-title">{{ t('common.appName') }}</h1>
          <p class="app-subtitle">{{ t('auth.login.subtitle') }}</p>
        </div>

        <!-- Formulario -->
        <div class="login-card">
          <h2 class="form-title">{{ t('auth.login.title') }}</h2>

          <form @submit.prevent="handleLogin" novalidate>
            <div class="field-group">
              <ion-input
                v-model="form.correo"
                type="email"
                :label="t('auth.login.emailLabel')"
                label-placement="floating"
                fill="outline"
                placeholder="usuario@ejemplo.com"
                autocomplete="email"
                :class="{ 'input-error': errors.correo }"
                @ion-blur="validateCorreo"
              />
              <p v-if="errors.correo" class="error-text">{{ errors.correo }}</p>
            </div>

            <div class="field-group">
              <ion-input
                v-model="form.contrasena"
                :type="showPassword ? 'text' : 'password'"
                :label="t('auth.login.passwordLabel')"
                label-placement="floating"
                fill="outline"
                placeholder="••••••••"
                autocomplete="current-password"
                :class="{ 'input-error': errors.contrasena }"
                @ion-blur="validateContrasena"
              >
                <ion-button
                  slot="end"
                  fill="clear"
                  size="small"
                  @click="showPassword = !showPassword"
                >
                  <ion-icon :icon="showPassword ? eyeOffOutline : eyeOutline" />
                </ion-button>
              </ion-input>
              <p v-if="errors.contrasena" class="error-text">{{ errors.contrasena }}</p>
            </div>

            <div v-if="loginError" class="alert-error">
              <ion-icon :icon="alertCircleOutline" />
              <span>{{ loginError }}</span>
            </div>

            <ion-button
              type="submit"
              expand="block"
              :disabled="isLoading"
              class="submit-btn"
            >
              <ion-spinner v-if="isLoading" name="crescent" slot="start" />
              {{ isLoading ? t('auth.login.submitting') : t('auth.login.submit') }}
            </ion-button>
          </form>

          <div class="form-links">
            <ion-button fill="clear" size="small" router-link="/forgot-password">
              {{ t('auth.login.forgotPassword') }}
            </ion-button>
          </div>
        </div>

        <!-- Enlace de registro -->
        <div class="register-link">
          <span>{{ t('auth.login.noAccount') }}</span>
          <ion-button fill="clear" size="small" router-link="/register">
            {{ t('auth.login.requestAccess') }}
          </ion-button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  IonPage, IonContent, IonInput, IonButton, IonIcon, IonSpinner,
} from '@ionic/vue'
import { leafOutline, eyeOutline, eyeOffOutline, alertCircleOutline } from 'ionicons/icons'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()

const form = reactive({ correo: '', contrasena: '' })
const errors = reactive({ correo: '', contrasena: '' })
const loginError = ref('')
const isLoading = ref(false)
const showPassword = ref(false)

function validateCorreo(): boolean {
  errors.correo = ''
  if (!form.correo) {
    errors.correo = t('auth.login.emailRequired')
    return false
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) {
    errors.correo = t('auth.login.emailInvalid')
    return false
  }
  return true
}

function validateContrasena(): boolean {
  errors.contrasena = ''
  if (!form.contrasena) {
    errors.contrasena = t('auth.login.passwordRequired')
    return false
  }
  return true
}

async function handleLogin() {
  const v1 = validateCorreo()
  const v2 = validateContrasena()
  const valid = v1 && v2
  if (!valid) return

  isLoading.value = true
  loginError.value = ''

  try {
    await authStore.login({ correo: form.correo, contrasena: form.contrasena })
    const destino = authStore.isVeterinario ? { name: 'HomeVeterinario' } : { name: 'HomeGanadero' }
    router.replace(destino)
  } catch (err: any) {
    const status = err?.response?.status
    if (status === 401 || status === 422) {
      loginError.value = t('auth.login.errorInvalidCredentials')
    } else {
      loginError.value = t('auth.login.errorConnection')
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-content {
  --background: linear-gradient(160deg, #004c4c 0%, #008080 40%, #e0f2f2 100%);
}

.login-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 24px 20px;
  box-sizing: border-box;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.logo-icon {
  font-size: 40px;
  color: #ffffff;
}

.app-title {
  font-size: 28px;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 4px;
  letter-spacing: -0.5px;
}

.app-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
}

.login-card {
  background: var(--bov-surface);
  border-radius: 20px;
  padding: 28px 24px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  color: var(--bov-text-strong);
  --ion-text-color: var(--bov-text-strong);
  --color: var(--bov-text-strong);
}

.login-card * {
  color: inherit;
}


.form-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--bov-text-strong);
  margin: 0 0 24px;
  text-align: center;
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
  background: var(--bov-danger-soft-bg);
  border: 1px solid var(--bov-danger-soft-border);
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
  font-size: 16px;
}

.form-links {
  display: flex;
  justify-content: center;
  margin-top: 12px;
}

.register-link {
  display: flex;
  align-items: center;
  margin-top: 24px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
}

.register-link ion-button {
  --color: #ffffff;
  font-weight: 600;
}

ion-input.input-error {
  --highlight-color-focused: var(--ion-color-danger);
  --border-color: var(--ion-color-danger);
}
</style>
