<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />

      <!-- Tab bar: Ganadero / Administrador -->
      <ion-tab-bar v-if="authStore.isGanadero || authStore.isAdmin" slot="bottom" color="primary">
        <ion-tab-button tab="home" href="/tabs/home">
          <ion-icon :icon="homeOutline" />
          <ion-label>Inicio</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="mi-ganado" href="/tabs/mi-ganado">
          <ion-icon :icon="searchOutline" />
          <ion-label>Buscar</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="perfil" href="/tabs/perfil">
          <ion-icon :icon="personOutline" />
          <ion-label>Perfil</ion-label>
        </ion-tab-button>
      </ion-tab-bar>

      <!-- Tab bar: Veterinario -->
      <ion-tab-bar v-else-if="authStore.isVeterinario" slot="bottom" color="primary">
        <ion-tab-button tab="home-vet" href="/tabs/home-vet">
          <ion-icon :icon="homeOutline" />
          <ion-label>Inicio</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="mi-ganado" href="/tabs/mi-ganado">
          <ion-icon :icon="searchOutline" />
          <ion-label>Buscar</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="perfil" href="/tabs/perfil">
          <ion-icon :icon="personOutline" />
          <ion-label>Perfil</ion-label>
        </ion-tab-button>
      </ion-tab-bar>

      <!-- Tab bar: Administrador (fallback — el admin usa el panel web) -->
      <ion-tab-bar v-else slot="bottom" color="primary">
        <ion-tab-button tab="mi-ganado" href="/tabs/mi-ganado">
          <ion-icon :icon="searchOutline" />
          <ion-label>Buscar</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="perfil" href="/tabs/perfil">
          <ion-icon :icon="personOutline" />
          <ion-label>Perfil</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonTabs, IonRouterOutlet, IonTabBar, IonTabButton, IonIcon, IonLabel,
} from '@ionic/vue'
import { homeOutline, personOutline, searchOutline } from 'ionicons/icons'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
</script>
