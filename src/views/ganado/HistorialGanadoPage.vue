<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonIcon,
} from '@ionic/vue'
import { timeOutline } from 'ionicons/icons'
import { useRoute } from 'vue-router'

const route = useRoute()
const animalId = Number(route.params.animalId)
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/home" />
        </ion-buttons>
        <ion-title>Historial</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="empty-state">
        <ion-icon :icon="timeOutline" class="empty-icon" />
        <p class="empty-title">Módulo en desarrollo</p>
        <p class="empty-sub">El historial del animal #{{ animalId }} estará disponible próximamente.</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 48px 24px;
  text-align: center;
  color: var(--ion-color-medium);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  color: var(--ion-color-primary);
}

.empty-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--ion-color-dark);
  margin: 0 0 8px;
}

.empty-sub {
  font-size: 0.9rem;
  margin: 0;
}
</style>
