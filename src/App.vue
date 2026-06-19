<template>
  <ion-app>
    <SyncStatusBanner />
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import SyncStatusBanner from '@/components/SyncStatusBanner.vue';
</script>
