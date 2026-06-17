<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Mi Perfil</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="perfil-content">
      <!-- Avatar y nombre -->
      <div class="profile-header">
        <div class="avatar-circle">
          <span class="avatar-initials">{{ initials }}</span>
        </div>
        <h2 class="profile-name">{{ authStore.user?.nombre }}</h2>
        <ion-badge :color="rolColor">{{ authStore.user?.tipo }}</ion-badge>
      </div>

      <!-- Datos del usuario -->
      <ion-list inset class="info-list">
        <ion-item>
          <ion-icon :icon="mailOutline" slot="start" color="primary" />
          <ion-label>
            <p>Correo electrónico</p>
            <h3>{{ authStore.user?.correo }}</h3>
          </ion-label>
        </ion-item>

        <ion-item>
          <ion-icon :icon="shieldCheckmarkOutline" slot="start" color="primary" />
          <ion-label>
            <p>Rol</p>
            <h3>{{ authStore.user?.tipo }}</h3>
          </ion-label>
        </ion-item>

        <ion-item>
          <ion-icon :icon="calendarOutline" slot="start" color="primary" />
          <ion-label>
            <p>Miembro desde</p>
            <h3>{{ memberSince }}</h3>
          </ion-label>
        </ion-item>
      </ion-list>

      <!-- Acciones -->
      <ion-list inset>
        <ion-item button @click="handleLogout">
          <ion-icon :icon="logOutOutline" slot="start" color="danger" />
          <ion-label color="danger">Cerrar sesión</ion-label>
        </ion-item>
      </ion-list>

      <!-- Aviso legal -->
      <div class="legal-notice">
        <ion-icon :icon="informationCircleOutline" />
        <p>
          Los resultados de estimación de peso son aproximaciones y
          <strong>no sustituyen mediciones oficiales</strong> con báscula certificada.
        </p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonItem, IonLabel, IonIcon, IonBadge,
  alertController,
} from '@ionic/vue'
import {
  mailOutline, shieldCheckmarkOutline, calendarOutline,
  logOutOutline, informationCircleOutline,
} from 'ionicons/icons'
import { useAuthStore } from '@/stores/auth'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const router = useRouter()
const authStore = useAuthStore()

const initials = computed(() => {
  const nombre = authStore.user?.nombre ?? ''
  return nombre
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
})

const rolColor = computed(() => {
  const tipo = authStore.user?.tipo
  if (tipo === 'Administrador') return 'danger'
  if (tipo === 'Veterinario') return 'tertiary'
  return 'primary'
})

const memberSince = computed(() => {
  const fecha = authStore.user?.creado_en
  if (!fecha) return '—'
  try {
    return format(new Date(fecha), "d 'de' MMMM, yyyy", { locale: es })
  } catch {
    return fecha
  }
})

async function handleLogout() {
  const alert = await alertController.create({
    header: 'Cerrar sesión',
    message: '¿Estás seguro de que deseas salir?',
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Cerrar sesión',
        role: 'destructive',
        handler: async () => {
          await authStore.logout()
          router.replace({ name: 'Login' })
        },
      },
    ],
  })
  await alert.present()
}
</script>

<style scoped>
.perfil-content {
  --background: #f0f4f8;
}

.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 20px 20px;
  gap: 10px;
}

.avatar-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #004c4c, #008080);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(45, 138, 78, 0.3);
}

.avatar-initials {
  font-size: 28px;
  font-weight: 700;
  color: #ffffff;
}

.profile-name {
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
  text-align: center;
}

.info-list {
  margin-top: 8px;
  --color: #1a1a1a;
  --ion-text-color: #1a1a1a;
  --ion-item-background: #ffffff;
}

.info-list ion-item h3 {
  font-size: 15px;
  font-weight: 500;
  color: #000000;
}

.info-list ion-item p {
  font-size: 12px;
  color: #555555;
}

.legal-notice {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 8px 16px 32px;
  background: #fff8e1;
  border: 1px solid #ffe082;
  border-radius: 10px;
  padding: 12px 14px;
  color: #795548;
  font-size: 12px;
  line-height: 1.5;
}

.legal-notice ion-icon {
  font-size: 18px;
  flex-shrink: 0;
  margin-top: 1px;
  color: #f57c00;
}

.legal-notice p {
  margin: 0;
}
</style>
