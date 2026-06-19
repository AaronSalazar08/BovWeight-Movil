import { useDark, useToggle } from '@vueuse/core'

/**
 * Estado de tema compartido a nivel de módulo: useDark() debe llamarse una
 * sola vez para que todos los componentes vean y reaccionen al mismo valor.
 * Por defecto sigue la preferencia del sistema (prefers-color-scheme) hasta
 * que el usuario elige explícitamente desde Configuración; a partir de ahí
 * @vueuse/core persiste la preferencia en localStorage (clave 'bov_theme').
 */
const esOscuro = useDark({
  selector: 'html',
  attribute: 'class',
  valueDark: 'dark',
  valueLight: '',
  storageKey: 'bov_theme',
})

const alternar = useToggle(esOscuro)

export function useTema() {
  return { esOscuro, alternarTema: alternar }
}
