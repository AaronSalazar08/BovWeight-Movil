<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>BovWeight CR</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="handleLogout">
            <ion-icon slot="icon-only" :icon="logOutOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="home-content">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <!-- Saludo -->
      <div class="welcome-section">
        <div class="welcome-card">
          <div class="welcome-avatar">
            <ion-icon :icon="personCircleOutline" class="avatar-icon" />
          </div>
          <div class="welcome-text">
            <p class="greeting">Bienvenido,</p>
            <h2 class="user-name">{{ authStore.userDisplayName }}</h2>
            <ion-badge :color="rolColor">{{ authStore.user?.tipo }}</ion-badge>
          </div>
        </div>
      </div>

      <!-- Módulos disponibles (próximas iteraciones) -->
      <div class="section-title">
        <h3>Módulos</h3>
      </div>

      <div class="modules-grid">
        <div class="module-card coming-soon">
          <ion-icon :icon="businessOutline" class="module-icon" />
          <p class="module-label">Mis Fincas</p>
          <ion-badge color="medium" class="soon-badge">Próximamente</ion-badge>
        </div>

        <div class="module-card coming-soon">
          <ion-icon :icon="pawOutline" class="module-icon" />
          <p class="module-label">Mi Ganado</p>
          <ion-badge color="medium" class="soon-badge">Próximamente</ion-badge>
        </div>

        <div class="module-card coming-soon">
          <ion-icon :icon="cameraOutline" class="module-icon" />
          <p class="module-label">Estimar Peso</p>
          <ion-badge color="medium" class="soon-badge">Próximamente</ion-badge>
        </div>

        <div class="module-card coming-soon">
          <ion-icon :icon="timeOutline" class="module-icon" />
          <p class="module-label">Historial</p>
          <ion-badge color="medium" class="soon-badge">Próximamente</ion-badge>
        </div>
      </div>

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
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
  IonIcon, IonBadge, IonRefresher, IonRefresherContent,
  alertController,
} from '@ionic/vue'
import {
  logOutOutline, personCircleOutline, businessOutline, pawOutline,
  cameraOutline, timeOutline, informationCircleOutline,
} from 'ionicons/icons'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const rolColor = computed(() => {
  const tipo = authStore.user?.tipo
  if (tipo === 'Administrador') return 'danger'
  if (tipo === 'Veterinario') return 'tertiary'
  return 'primary'
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

async function handleRefresh(event: CustomEvent) {
  await authStore.fetchCurrentUser()
  ;(event.target as HTMLIonRefresherElement).complete()
}
</script>

<style scoped>
.home-content {
  --background: #f0f4f8;
}

.welcome-section {
  padding: 16px 16px 0;
}

.welcome-card {
  background: linear-gradient(135deg, #1a5c2a, #2d8a4e);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  color: #ffffff;
}

.welcome-avatar {
  flex-shrink: 0;
}

.avatar-icon {
  font-size: 52px;
  color: rgba(255, 255, 255, 0.9);
}

.welcome-text {
  flex: 1;
  min-width: 0;
}

.greeting {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
  margin: 0 0 2px;
}

.user-name {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.section-title {
  padding: 20px 16px 8px;
}

.section-title h3 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.modules-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 0 16px;
  color: #1a1a1a;
}

.module-card {
  background: #ffffff;
  border-radius: 14px;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: transform 0.15s ease;
}

.module-card:active {
  transform: scale(0.96);
}

.module-card.coming-soon {
  opacity: 0.65;
  cursor: default;
}

.module-card.coming-soon:active {
  transform: none;
}

.module-icon {
  font-size: 32px;
  color: var(--ion-color-primary);
}

.module-label {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.soon-badge {
  font-size: 10px;
}

.legal-notice {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 20px 16px 32px;
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
