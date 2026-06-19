import { createI18n } from 'vue-i18n'
import esLA from './locales/es-LA.json'
import enUS from './locales/en-US.json'

export const SUPPORTED_LOCALES = ['es-LA', 'en-US'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const LOCALE_STORAGE_KEY = 'bov_locale'

function esSupportedLocale(valor: string | null): valor is SupportedLocale {
  return valor !== null && (SUPPORTED_LOCALES as readonly string[]).includes(valor)
}

function obtenerLocaleInicial(): SupportedLocale {
  const guardado = localStorage.getItem(LOCALE_STORAGE_KEY)
  return esSupportedLocale(guardado) ? guardado : 'es-LA'
}

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: obtenerLocaleInicial(),
  fallbackLocale: 'es-LA',
  messages: {
    'es-LA': esLA,
    'en-US': enUS,
  },
})

export default i18n
