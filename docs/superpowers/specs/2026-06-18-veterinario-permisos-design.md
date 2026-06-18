# Restricción de accesos del rol Veterinario

**Fecha:** 2026-06-18
**Repos afectados:** `BovWeight-Movil` (frontend Vue + Ionic), `Bovweightcr-API` (backend Laravel)

## Contexto

Hoy el rol "Veterinario" tiene, en la práctica, casi los mismos permisos de escritura sobre el ganado que el "Ganadero" en la app móvil (agregar, editar completo, eliminar, estimar peso con IA, editar estado comercial), aunque el backend ya bloquea sus escrituras vía `PUT/POST/DELETE /ganado` porque esas rutas exigen ser dueño de la finca (`verificarPropiedadFinca`). El objetivo es alinear la UI con un set de permisos reducido y darle al veterinario una capacidad nueva: editar el estado de salud del animal, algo que hoy nadie puede hacer (el campo `estado_salud_id` no es editable desde ninguna UI ni lo permite ningún endpoint dedicado).

## Objetivo

**El veterinario deja de ver/poder:**
1. Estimar peso con IA.
2. Agregar ganado a las fincas.
3. Editar el animal completo (crear/editar/eliminar) — su única edición permitida es el estado de salud.
4. Ver el estado comercial del animal — en su lugar ve el estado de salud, que es el único campo que puede cambiar.

**El veterinario gana:**
1. Editar el estado de salud del animal (capacidad nueva, requiere backend).
2. Ver el detalle completo del animal y su historial (sin cambios, ya lo tenía).
3. Generar reportes (sin cambios, ya lo tenía).

**El ganadero no cambia:** mantiene su flujo completo actual (agregar, editar todo, eliminar, estimar peso, estado comercial) y NO obtiene acceso para editar el estado de salud.

## Backend (Bovweightcr-API)

### Nuevo endpoint

- **Ruta:** `PATCH /ganado/{id}/estado-salud`
- **Controlador:** `GanadoController::actualizarEstadoSalud(Request $request, string $id)`
  - Validación: `'estado_salud_id' => 'required|exists:estado_salud_ganados,id'`
  - Respuestas: 200 con el animal actualizado; 403 si el usuario no es el veterinario asignado a la finca del animal; 404 si el animal no existe.
- **Servicio:** `GanadoService::actualizarEstadoSalud(int $id, int $estadoSaludId, User $user): Ganado`
  - Obtiene el animal con `obtener()`.
  - Verifica con un nuevo método privado `verificarVeterinarioAsignado(int $fincaId, User $user)`: el usuario debe tener `tipoUsuario->nombre === 'Veterinario'` Y `finca->veterinario_id === $user->id`. El ganadero dueño (aunque sea el mismo usuario en otro rol hipotético) NO pasa este check — esta ruta es exclusiva del veterinario asignado.
  - Si pasa, asigna `estado_salud_id` y guarda.

### Sin cambios

- `store`, `update` (PUT), `destroy`, `registrarPeso` siguen usando `verificarPropiedadFinca` (solo dueño). Un veterinario que los llame directo sigue recibiendo 403, igual que hoy.
- `verificarAccesoFinca` (lectura: dueño o vet asignado) no cambia — el veterinario sigue pudiendo ver el detalle y el historial.

## Frontend (BovWeight-Movil)

### Composable de permisos

Nuevo archivo `src/composables/usePermisosGanado.ts`:

```ts
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

export function usePermisosGanado() {
  const auth = useAuthStore()
  const esVeterinario = computed(() => auth.isVeterinario)

  return {
    puedeAgregarGanado: computed(() => !esVeterinario.value),
    puedeEditarCompleto: computed(() => !esVeterinario.value),
    puedeEditarEstadoSalud: computed(() => esVeterinario.value),
    campoEstadoPrincipal: computed(() => (esVeterinario.value ? 'estado_salud' : 'estado_comercial') as const),
  }
}
```

Este composable es la única fuente de verdad sobre qué puede hacer cada rol en las vistas de ganado. Si las reglas cambian a futuro, se edita en un solo lugar.

### `src/api/ganado.ts`

Nueva función:

```ts
export const actualizarEstadoSalud = async (id: number, estadoSaludId: number): Promise<Ganado> => {
  const response = await client.patch(`/ganado/${id}/estado-salud`, { estado_salud_id: estadoSaludId })
  return response.data.data
}
```

### `AnimalesPage.vue` (lista de animales por finca)

- `usePermisosGanado()` → `puedeAgregarGanado`, `puedeEditarCompleto`.
- El `ion-fab` (botón "+") se condiciona con `v-if="puedeAgregarGanado"`.
- El botón "..." (`abrirOpciones`, que ofrece Editar/Eliminar) se condiciona con `v-if="puedeEditarCompleto"`. El veterinario solo ve el botón "Seleccionar" para ir al detalle.
- `abrirModal`, `editarAnimal`, `abrirOpciones`, `guardar` no se eliminan del script — simplemente quedan inalcanzables desde el template para el veterinario.

### `MiGanadoPage.vue` (búsqueda global "Mi Ganado")

- Mismo composable. El botón "..." (`abrirOpciones`) se condiciona con `v-if="puedeEditarCompleto"`. No tiene FAB de agregar (ya no existe en esta vista), así que no aplica ese punto aquí.

### `DetalleGanadoPage.vue` (detalle del animal)

- El ícono de lápiz en el header (`abrirEditar`, abre el modal completo) se condiciona con `v-if="puedeEditarCompleto"`.
- En el grid de información, la columna "ESTADO": cuando `puedeEditarEstadoSalud` es `true`, el valor principal mostrado es `animal.estado_salud?.nombre` (en vez de `animal.estado_comercial?.nombre`), y el elemento se vuelve interactivo (`@click`) solo en ese caso.
- Al tocar la columna "ESTADO" (solo veterinario), se abre un `actionSheetController` con un botón por cada `estadoSalud` del catálogo. Al elegir uno, se llama a `actualizarEstadoSalud(animal.id, nuevoId)`; en éxito se recarga `animal` con `cargar()`; en error se muestra un `alertController` con el mensaje del backend.
- El modal completo de edición (foto, estimar con IA, peso, arete, nombre, finca, raza, estado comercial) no cambia su contenido — el ganadero lo sigue usando igual. El veterinario nunca lo abre porque ya no tiene el botón que lo dispara.
- "Ver historial completo" se mantiene sin cambios para ambos roles.

### Estimar peso con IA

No requiere un cambio dedicado: la función `estimarConIA()` solo vive dentro de los modales de "Nuevo/Editar Animal" en `AnimalesPage.vue` y `DetalleGanadoPage.vue`. Al quitarle al veterinario los botones que abren esos modales, pierde acceso a la función automáticamente.

### `HomeVeterinarioPage.vue`

- Se elimina la tarjeta "Estimar Peso" (`Próximamente`) del grid de módulos. El grid pasa de 4 a 3 tarjetas (Fincas Asignadas, Ganado, Historial General).
- `HomeGanaderoPage.vue` no cambia.

## Manejo de errores

- Si `PATCH /ganado/{id}/estado-salud` devuelve 403 (p. ej. el veterinario ya no está asignado a esa finca) o 404, `DetalleGanadoPage.vue` muestra un `alertController` con el mensaje del backend, siguiendo el mismo patrón que ya usan `estimarConIA` y `guardar`.
- Las rutas `PUT/POST/DELETE /ganado` no cambian su comportamiento ante intentos directos de un veterinario (403 ya garantizado por `verificarPropiedadFinca`).

## Plan de pruebas (manual)

1. **Veterinario — listas:** en la lista de animales de una finca asignada y en "Mi Ganado", no aparece el FAB "+" ni el botón "...". Solo "Seleccionar" está visible.
2. **Veterinario — detalle:** no aparece el ícono de editar en el header. La columna "ESTADO" muestra el estado de salud y es tocable; al elegir uno nuevo desde el action sheet, se guarda y se refleja en pantalla.
3. **Veterinario — backend directo:** llamar `PATCH /ganado/{id}/estado-salud` para un animal de una finca NO asignada devuelve 403.
4. **Ganadero — regresión:** el flujo completo de agregar, editar (incluye estimar con IA), eliminar y cambiar estado comercial sigue funcionando igual que hoy. No tiene ninguna forma de cambiar el estado de salud.
5. **Home:** el inicio del veterinario ya no muestra la tarjeta "Estimar Peso"; el del ganadero no cambia.

## Fuera de alcance

- No se modifica `EstimacionPesoController` (la ruta sigue pública/sin auth, eso es un tema aparte ya marcado como "para desarrollo" en el código).
- No se agregan políticas/Gates de Laravel de forma general — se sigue el patrón existente de checks imperativos en el service layer, solo se añade el nuevo método de verificación.
- No se toca `FincasPage.vue` / `canManageFincas` (la restricción de fincas para el veterinario ya existe y está correcta).
- No se modifica `ReportesPage.vue` (los reportes se mantienen iguales para todos los roles, incluyendo la distribución por estado comercial agregada).
