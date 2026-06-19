import { useI18n } from 'vue-i18n'
import { SUPPORTED_LOCALES, LOCALE_STORAGE_KEY, type SupportedLocale } from '@/i18n'

const NOMBRES_IDIOMA: Record<SupportedLocale, string> = {
  'es-LA': 'Español (Latinoamérica)',
  'en-US': 'English (US)',
}

/** Selector de idioma para Perfil > Configuración. Persiste la preferencia entre sesiones. */
export function useIdioma() {
  const { locale } = useI18n()

  function cambiarIdioma(nuevo: SupportedLocale) {
    locale.value = nuevo
    localStorage.setItem(LOCALE_STORAGE_KEY, nuevo)
  }

  return {
    idiomaActual: locale,
    idiomasDisponibles: SUPPORTED_LOCALES,
    nombresIdioma: NOMBRES_IDIOMA,
    cambiarIdioma,
  }
}
