<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/login" text="" />
        </ion-buttons>
        <ion-title>Solicitar acceso</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="register-content">
      <div class="register-wrapper">
        <div class="register-info">
          <ion-icon :icon="informationCircleOutline" class="info-icon" />
          <p>
            Tu solicitud será revisada por un administrador. Recibirás una notificación
            al correo cuando sea aprobada.
          </p>
        </div>

        <form @submit.prevent="handleRegister" novalidate>
          <!-- Nombre -->
          <div class="field-group">
            <ion-input
              v-model="form.nombre"
              type="text"
              label="Nombre *"
              label-placement="floating"
              fill="outline"
              placeholder="Juan"
              autocomplete="given-name"
              :class="{ 'input-error': errors.nombre }"
              @ion-blur="validateNombre"
            />
            <p v-if="errors.nombre" class="error-text">{{ errors.nombre }}</p>
          </div>

          <!-- Apellidos -->
          <div class="field-group">
            <ion-input
              v-model="form.apellidos"
              type="text"
              label="Apellidos *"
              label-placement="floating"
              fill="outline"
              placeholder="Pérez Rodríguez"
              autocomplete="family-name"
              :class="{ 'input-error': errors.apellidos }"
              @ion-blur="validateApellidos"
            />
            <p v-if="errors.apellidos" class="error-text">{{ errors.apellidos }}</p>
          </div>

          <!-- Correo -->
          <div class="field-group">
            <ion-input
              v-model="form.correo"
              type="email"
              label="Correo electrónico *"
              label-placement="floating"
              fill="outline"
              placeholder="usuario@ejemplo.com"
              autocomplete="email"
              :class="{ 'input-error': errors.correo }"
              @ion-blur="validateCorreo"
            />
            <p v-if="errors.correo" class="error-text">{{ errors.correo }}</p>
          </div>

          <!-- Celular -->
          <div class="field-group">
            <ion-input
              v-model="form.numero_celular"
              type="tel"
              label="Número de celular *"
              label-placement="floating"
              fill="outline"
              placeholder="8888-8888"
              autocomplete="tel"
              :class="{ 'input-error': errors.numero_celular }"
              @ion-blur="validateCelular"
            />
            <p v-if="errors.numero_celular" class="error-text">{{ errors.numero_celular }}</p>
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
            {{ isLoading ? 'Enviando solicitud...' : 'Enviar solicitud' }}
          </ion-button>
        </form>
      </div>
    </ion-content>

    <!-- Modal de éxito -->
    <ion-modal :is-open="showSuccess" :initial-breakpoint="0.5" :breakpoints="[0, 0.5]">
      <ion-content class="success-modal">
        <div class="success-content">
          <div class="success-icon-wrapper">
            <ion-icon :icon="checkmarkCircleOutline" class="success-icon" />
          </div>
          <h3>¡Solicitud enviada!</h3>
          <p>
            Tu solicitud fue registrada exitosamente. Recibirás un correo electrónico
            cuando el administrador revise tu solicitud.
          </p>
          <ion-button expand="block" @click="goToLogin" class="success-btn">
            Volver al inicio de sesión
          </ion-button>
        </div>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonInput, IonButton, IonIcon, IonSpinner, IonModal,
} from '@ionic/vue'
import {
  informationCircleOutline, alertCircleOutline, checkmarkCircleOutline,
} from 'ionicons/icons'
import { solicitudesApi } from '@/api/solicitudes'

const router = useRouter()

const form = reactive({
  nombre: '',
  apellidos: '',
  correo: '',
  numero_celular: '',
})

const errors = reactive({
  nombre: '',
  apellidos: '',
  correo: '',
  numero_celular: '',
})

const isLoading = ref(false)
const submitError = ref('')
const showSuccess = ref(false)

function validateNombre(): boolean {
  errors.nombre = ''
  if (!form.nombre.trim()) {
    errors.nombre = 'El nombre es requerido.'
    return false
  }
  if (form.nombre.trim().length < 2) {
    errors.nombre = 'El nombre debe tener al menos 2 caracteres.'
    return false
  }
  return true
}

function validateApellidos(): boolean {
  errors.apellidos = ''
  if (!form.apellidos.trim()) {
    errors.apellidos = 'Los apellidos son requeridos.'
    return false
  }
  return true
}

function validateCorreo(): boolean {
  errors.correo = ''
  if (!form.correo) {
    errors.correo = 'El correo electrónico es requerido.'
    return false
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) {
    errors.correo = 'Ingresa un correo electrónico válido.'
    return false
  }
  return true
}

function validateCelular(): boolean {
  errors.numero_celular = ''
  if (!form.numero_celular.trim()) {
    errors.numero_celular = 'El número de celular es requerido.'
    return false
  }
  if (form.numero_celular.replace(/\D/g, '').length < 8) {
    errors.numero_celular = 'Ingresa un número de celular válido.'
    return false
  }
  return true
}

function validateAll(): boolean {
  const results = [
    validateNombre(),
    validateApellidos(),
    validateCorreo(),
    validateCelular(),
  ]
  return results.every(Boolean)
}

async function handleRegister() {
  if (!validateAll()) return

  isLoading.value = true
  submitError.value = ''

  try {
    await solicitudesApi.create({
      nombre: form.nombre.trim(),
      apellidos: form.apellidos.trim(),
      correo: form.correo.trim(),
      numero_celular: form.numero_celular.trim(),
    })
    showSuccess.value = true
  } catch (err: any) {
    const status = err?.response?.status
    if (status === 422) {
      const apiErrors = err.response.data?.errors
      if (apiErrors?.correo) {
        errors.correo = apiErrors.correo[0]
      } else {
        submitError.value = 'Verifica los datos ingresados e intenta de nuevo.'
      }
    } else {
      submitError.value = 'No se pudo enviar la solicitud. Intenta de nuevo.'
    }
  } finally {
    isLoading.value = false
  }
}

function goToLogin() {
  showSuccess.value = false
  router.replace({ name: 'Login' })
}
</script>

<style scoped>
.register-content {
  --background: var(--ion-background-color);
}

.register-wrapper {
  padding: 20px 16px 32px;
  max-width: 500px;
  margin: 0 auto;
  color: var(--bov-text-strong);
  --ion-text-color: var(--bov-text-strong);
  --color: var(--bov-text-strong);
}

.register-info {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: var(--bov-success-soft-bg);
  border: 1px solid var(--bov-success-soft-border);
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 24px;
  color: var(--bov-success-soft-text);
  font-size: 13px;
  line-height: 1.5;
}

.info-icon {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 1px;
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

ion-input.input-error {
  --highlight-color-focused: var(--ion-color-danger);
  --border-color: var(--ion-color-danger);
}

/* Modal de éxito */
.success-modal {
  --background: var(--bov-surface);
}

.success-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 32px 24px;
  color: var(--bov-text-strong);
  --ion-text-color: var(--bov-text-strong);
  --color: var(--bov-text-strong);
}

.success-icon-wrapper {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--bov-success-soft-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.success-icon {
  font-size: 40px;
  color: var(--ion-color-primary);
}

.success-content h3 {
  font-size: 20px;
  font-weight: 700;
  color: var(--bov-text-strong);
  margin: 0 0 12px;
}

.success-content p {
  font-size: 14px;
  color: var(--bov-text-muted);
  margin: 0 0 24px;
  line-height: 1.6;
}

.success-btn {
  width: 100%;
  --border-radius: 10px;
  height: 48px;
  font-weight: 600;
}
</style>
