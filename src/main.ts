import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { useTema } from './composables/useTema'

import { IonicVue } from '@ionic/vue'
import { defineCustomElements } from '@ionic/pwa-elements/loader'

/* Core CSS required for Ionic components to work properly */
import '@ionic/vue/css/core.css'

/* Basic CSS for apps built with Ionic */
import '@ionic/vue/css/normalize.css'
import '@ionic/vue/css/structure.css'
import '@ionic/vue/css/typography.css'

/* Optional CSS utils */
import '@ionic/vue/css/padding.css'
import '@ionic/vue/css/float-elements.css'
import '@ionic/vue/css/text-alignment.css'
import '@ionic/vue/css/text-transformation.css'
import '@ionic/vue/css/flex-utils.css'
import '@ionic/vue/css/display.css'

/* Theme variables */
import './theme/variables.css'

// Aplica la clase 'dark' en <html> antes de montar la app, para evitar un
// parpadeo del tema incorrecto en el primer render.
useTema()

const app = createApp(App)

app.use(IonicVue)
app.use(createPinia())
app.use(router)
app.use(VueQueryPlugin)
app.use(i18n)

router.isReady().then(() => {
  app.mount('#app')
})

defineCustomElements(window)
