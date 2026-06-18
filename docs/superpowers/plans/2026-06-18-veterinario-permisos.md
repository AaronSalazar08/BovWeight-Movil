# Restricción de accesos del Veterinario — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restringir al rol Veterinario en BovWeight para que no pueda agregar/editar/eliminar ganado ni estimar peso con IA, y darle en su lugar la capacidad exclusiva de editar el estado de salud del animal (que el ganadero no puede tocar).

**Architecture:** Backend (Laravel): nuevo endpoint dedicado `PATCH /ganado/{id}/estado-salud`, restringido al veterinario asignado a la finca del animal, sin tocar los endpoints existentes. Frontend (Vue + Ionic): un composable `usePermisosGanado()` centraliza las banderas de permiso por rol; las vistas existentes (`AnimalesPage.vue`, `MiGanadoPage.vue`, `DetalleGanadoPage.vue`, `HomeVeterinarioPage.vue`) lo consumen para condicionar botones y, en el detalle, para mostrar/editar el estado de salud en vez del estado comercial.

**Tech Stack:** Laravel 12 + PHPUnit (backend, `Bovweightcr-API`), Vue 3 + Ionic 8 + Pinia + Vitest (frontend, `BovWeight-Movil`).

## Global Constraints

- Nuevo endpoint backend: `PATCH /ganado/{id}/estado-salud`, valida únicamente `estado_salud_id` (`required|exists:estado_salud_ganados,id`).
- Solo el veterinario **asignado a la finca** del animal puede usar ese endpoint (ni el ganadero dueño, ni un veterinario de otra finca, ni el administrador).
- Los endpoints existentes (`POST /ganado`, `PUT /ganado/{id}`, `DELETE /ganado/{id}`, `POST /ganado/{id}/peso`) no cambian su validación ni autorización.
- El flujo del Ganadero no cambia en ninguna vista.
- El composable frontend se llama `usePermisosGanado` y vive en `src/composables/usePermisosGanado.ts`, expone `puedeAgregarGanado`, `puedeEditarCompleto`, `puedeEditarEstadoSalud`, `campoEstadoPrincipal` (todos `ComputedRef`).
- La tarjeta "Estimar Peso" se quita únicamente del home del veterinario (`HomeVeterinarioPage.vue`); el home del ganadero no se toca.
- No se agregan tests automatizados de componentes Vue/Ionic (no hay precedente en el repo más allá de un test de ejemplo) — los cambios de plantilla se verifican manualmente siguiendo el plan de pruebas de la Tarea 8.

---

### Task 1: Backend — endpoint `PATCH /ganado/{id}/estado-salud`

**Files:**
- Create: `Bovweightcr-API/tests/Feature/Controllers/GanadoControllerTest/ActualizarEstadoSaludTest.php`
- Modify: `Bovweightcr-API/app/Services/GanadoService.php`
- Modify: `Bovweightcr-API/app/Http/Controllers/Api/GanadoController.php`
- Modify: `Bovweightcr-API/routes/api.php`

**Interfaces:**
- Produces: `GanadoService::actualizarEstadoSalud(int $id, int $estadoSaludId, User $user): Ganado` — usado solo por `GanadoController::actualizarEstadoSalud`.
- Produces: ruta nombrada implícitamente `PATCH /api/ganado/{id}/estado-salud`, controlador `GanadoController::actualizarEstadoSalud(Request $request, string $id)`.

- [ ] **Step 1: Escribir los tests que fallan**

Crear `Bovweightcr-API/tests/Feature/Controllers/GanadoControllerTest/ActualizarEstadoSaludTest.php`:

```php
<?php

namespace Tests\Feature\Controllers\GanadoControllerTest;

use App\Models\EstadoComercialGanado;
use App\Models\EstadoSaludGanado;
use App\Models\Finca;
use App\Models\Ganado;
use App\Models\User;
use Database\Seeders\EstadoComercialGanadoSeeder;
use Database\Seeders\EstadoSaludGanadoSeeder;
use Database\Seeders\TipoUsuarioSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ActualizarEstadoSaludTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(TipoUsuarioSeeder::class);
        $this->seed(EstadoSaludGanadoSeeder::class);
        $this->seed(EstadoComercialGanadoSeeder::class);
    }

    private function crearFincaYGanado(int $duenoId, ?int $veterinarioId = null): Ganado
    {
        $finca = Finca::create([
            'usuario_id' => $duenoId,
            'veterinario_id' => $veterinarioId,
            'nombre' => 'Finca Central',
            'ubicacion' => 'Puntarenas',
            'area' => 75.0,
            'numero_finca' => 'CR-5001',
        ]);

        $salud = EstadoSaludGanado::first();
        $comercial = EstadoComercialGanado::first();

        return Ganado::create([
            'finca_id' => $finca->id,
            'estado_salud_id' => $salud->id,
            'estado_comercial_id' => $comercial->id,
            'arete' => 'ART-0001',
            'nombre' => 'Vaca 1',
            'sexo' => 'Hembra',
            'raza' => 'Holstein',
        ]);
    }

    public function test_veterinario_asignado_puede_actualizar_estado_salud(): void
    {
        $ganadero = User::factory()->ganadero()->create();
        $veterinario = User::factory()->veterinario()->create();
        $ganado = $this->crearFincaYGanado($ganadero->id, $veterinario->id);
        $nuevoEstado = EstadoSaludGanado::where('id', '!=', $ganado->estado_salud_id)->first()
            ?? EstadoSaludGanado::create(['nombre' => 'En tratamiento']);

        $response = $this->actingAs($veterinario)
            ->patchJson("/api/ganado/{$ganado->id}/estado-salud", [
                'estado_salud_id' => $nuevoEstado->id,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.estado_salud_id', $nuevoEstado->id);
    }

    public function test_veterinario_no_asignado_recibe_403(): void
    {
        $ganadero = User::factory()->ganadero()->create();
        $veterinarioAsignado = User::factory()->veterinario()->create();
        $otroVeterinario = User::factory()->veterinario()->create();
        $ganado = $this->crearFincaYGanado($ganadero->id, $veterinarioAsignado->id);
        $estado = EstadoSaludGanado::first();

        $response = $this->actingAs($otroVeterinario)
            ->patchJson("/api/ganado/{$ganado->id}/estado-salud", [
                'estado_salud_id' => $estado->id,
            ]);

        $response->assertStatus(403);
    }

    public function test_ganadero_dueno_no_puede_usar_este_endpoint(): void
    {
        $ganadero = User::factory()->ganadero()->create();
        $veterinario = User::factory()->veterinario()->create();
        $ganado = $this->crearFincaYGanado($ganadero->id, $veterinario->id);
        $estado = EstadoSaludGanado::first();

        $response = $this->actingAs($ganadero)
            ->patchJson("/api/ganado/{$ganado->id}/estado-salud", [
                'estado_salud_id' => $estado->id,
            ]);

        $response->assertStatus(403);
    }

    public function test_actualizar_estado_salud_animal_inexistente_devuelve_404(): void
    {
        $veterinario = User::factory()->veterinario()->create();
        $estado = EstadoSaludGanado::first();

        $response = $this->actingAs($veterinario)
            ->patchJson('/api/ganado/9999/estado-salud', [
                'estado_salud_id' => $estado->id,
            ]);

        $response->assertStatus(404);
    }

    public function test_estado_salud_id_invalido_devuelve_422(): void
    {
        $ganadero = User::factory()->ganadero()->create();
        $veterinario = User::factory()->veterinario()->create();
        $ganado = $this->crearFincaYGanado($ganadero->id, $veterinario->id);

        $response = $this->actingAs($veterinario)
            ->patchJson("/api/ganado/{$ganado->id}/estado-salud", [
                'estado_salud_id' => 999999,
            ]);

        $response->assertStatus(422);
    }
}
```

- [ ] **Step 2: Ejecutar los tests y verificar que fallan**

Run: `cd Bovweightcr-API && php artisan test --filter=ActualizarEstadoSaludTest`
Expected: FAIL — la ruta no existe todavía, las peticiones devuelven 404 en todos los casos salvo el de "animal inexistente" (que coincide por casualidad) y el de validación 422 (no hay ruta que valide nada, también falla).

- [ ] **Step 3: Agregar la ruta**

Modificar `Bovweightcr-API/routes/api.php`, justo después de la línea `Route::post('ganado/{id}/peso', [GanadoController::class, 'registrarPeso']);`:

```php
    Route::post('ganado/{id}/peso', [GanadoController::class, 'registrarPeso']);
    Route::patch('ganado/{id}/estado-salud', [GanadoController::class, 'actualizarEstadoSalud']);
    Route::get('ganado/{id}/historial', [RegistroPesoController::class, 'historial']);
```

- [ ] **Step 4: Agregar el método al servicio**

Modificar `Bovweightcr-API/app/Services/GanadoService.php`. Agregar este método público justo después de `registrarPeso()` (antes del comentario `/** Acceso de LECTURA... */`):

```php
    /**
     * Actualiza el estado de salud del animal. Acceso exclusivo del
     * veterinario asignado a la finca del animal (ni el dueño ni otro
     * veterinario pueden usar esta operación).
     */
    public function actualizarEstadoSalud(int $id, int $estadoSaludId, User $user): Ganado
    {
        $ganado = $this->obtener($id);

        $this->verificarVeterinarioAsignado($ganado->finca_id, $user);

        $ganado->estado_salud_id = $estadoSaludId;

        return $this->ganados->save($ganado);
    }
```

Y agregar este método privado al final de la clase, después de `verificarPropiedadFinca()`:

```php
    /**
     * Acceso de ESCRITURA exclusivo del veterinario asignado (solo para
     * cambiar el estado de salud, no para el resto del animal).
     */
    private function verificarVeterinarioAsignado(int $fincaId, User $user): void
    {
        $user->loadMissing('tipoUsuario');

        $finca = Finca::find($fincaId);

        if (! $finca) {
            throw new NotFoundHttpException('Finca no encontrada.');
        }

        $esVeterinario = $user->tipoUsuario?->nombre === 'Veterinario';
        $esAsignado    = $finca->veterinario_id === $user->id;

        if (! $esVeterinario || ! $esAsignado) {
            throw new AccessDeniedHttpException('Solo el veterinario asignado a esta finca puede actualizar el estado de salud.');
        }
    }
```

- [ ] **Step 5: Agregar el método al controlador**

Modificar `Bovweightcr-API/app/Http/Controllers/Api/GanadoController.php`. Agregar este método público justo después de `registrarPeso()` (antes de `destroy()`):

```php
    public function actualizarEstadoSalud(Request $request, string $id)
    {
        $validated = $request->validate([
            'estado_salud_id' => 'required|exists:estado_salud_ganados,id',
        ]);

        try {
            $ganado = $this->ganadoService->actualizarEstadoSalud(
                (int) $id,
                (int) $validated['estado_salud_id'],
                auth()->user(),
            );

            return response()->json([
                'message' => 'Estado de salud actualizado correctamente',
                'data'    => $ganado,
            ]);
        } catch (AccessDeniedHttpException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        } catch (NotFoundHttpException $e) {
            return response()->json(['message' => $e->getMessage()], 404);
        }
    }
```

- [ ] **Step 6: Ejecutar los tests y verificar que pasan**

Run: `cd Bovweightcr-API && php artisan test --filter=ActualizarEstadoSaludTest`
Expected: PASS — 5 tests, 0 failures.

- [ ] **Step 7: Ejecutar toda la suite de Ganado para evitar regresiones**

Run: `cd Bovweightcr-API && php artisan test --filter=GanadoControllerTest`
Expected: PASS — todos los tests existentes de `IndexTest`, `StoreTest`, `UpdateTest`, `ShowTest`, `DestroyTest`, `RegistrarPesoTest` y el nuevo `ActualizarEstadoSaludTest` en verde.

- [ ] **Step 8: Commit**

```bash
cd Bovweightcr-API
git add app/Services/GanadoService.php app/Http/Controllers/Api/GanadoController.php routes/api.php tests/Feature/Controllers/GanadoControllerTest/ActualizarEstadoSaludTest.php
git commit -m "feat: agregar endpoint para que el veterinario asignado edite el estado de salud"
```

---

### Task 2: Frontend — composable `usePermisosGanado`

**Files:**
- Create: `BovWeight-Movil/src/composables/usePermisosGanado.ts`
- Test: `BovWeight-Movil/tests/unit/composables/usePermisosGanado.spec.ts`

**Interfaces:**
- Consumes: `useAuthStore()` de `src/stores/auth.ts` — usa `isVeterinario: ComputedRef<boolean>`.
- Produces: `usePermisosGanado(): { puedeAgregarGanado: ComputedRef<boolean>, puedeEditarCompleto: ComputedRef<boolean>, puedeEditarEstadoSalud: ComputedRef<boolean>, campoEstadoPrincipal: ComputedRef<'estado_salud' | 'estado_comercial'> }` — usado por las Tareas 4, 5 y 6.

- [ ] **Step 1: Escribir el test que falla**

Crear `BovWeight-Movil/tests/unit/composables/usePermisosGanado.spec.ts`:

```ts
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { useAuthStore } from '@/stores/auth'
import { usePermisosGanado } from '@/composables/usePermisosGanado'
import type { User } from '@/types'

function setUsuario(tipo: User['tipo']) {
  const auth = useAuthStore()
  auth.user = {
    id: 1,
    nombre: 'Usuario de prueba',
    correo: 'prueba@bovweight.cr',
    tipo,
    creado_en: '2026-01-01',
  }
}

describe('usePermisosGanado', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  test('el ganadero puede agregar y editar completo, no puede editar estado de salud', () => {
    setUsuario('Ganadero')
    const permisos = usePermisosGanado()

    expect(permisos.puedeAgregarGanado.value).toBe(true)
    expect(permisos.puedeEditarCompleto.value).toBe(true)
    expect(permisos.puedeEditarEstadoSalud.value).toBe(false)
    expect(permisos.campoEstadoPrincipal.value).toBe('estado_comercial')
  })

  test('el veterinario no puede agregar ni editar completo, solo editar estado de salud', () => {
    setUsuario('Veterinario')
    const permisos = usePermisosGanado()

    expect(permisos.puedeAgregarGanado.value).toBe(false)
    expect(permisos.puedeEditarCompleto.value).toBe(false)
    expect(permisos.puedeEditarEstadoSalud.value).toBe(true)
    expect(permisos.campoEstadoPrincipal.value).toBe('estado_salud')
  })
})
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `cd BovWeight-Movil && npx vitest run tests/unit/composables/usePermisosGanado.spec.ts`
Expected: FAIL — `Cannot find module '@/composables/usePermisosGanado'` (el archivo no existe todavía).

- [ ] **Step 3: Implementar el composable**

Crear `BovWeight-Movil/src/composables/usePermisosGanado.ts`:

```ts
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

export function usePermisosGanado() {
  const auth = useAuthStore()
  const esVeterinario = computed(() => auth.isVeterinario)

  const puedeAgregarGanado = computed(() => !esVeterinario.value)
  const puedeEditarCompleto = computed(() => !esVeterinario.value)
  const puedeEditarEstadoSalud = computed(() => esVeterinario.value)
  const campoEstadoPrincipal = computed<'estado_salud' | 'estado_comercial'>(() =>
    esVeterinario.value ? 'estado_salud' : 'estado_comercial',
  )

  return {
    puedeAgregarGanado,
    puedeEditarCompleto,
    puedeEditarEstadoSalud,
    campoEstadoPrincipal,
  }
}
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

Run: `cd BovWeight-Movil && npx vitest run tests/unit/composables/usePermisosGanado.spec.ts`
Expected: PASS — 2 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
cd BovWeight-Movil
git add src/composables/usePermisosGanado.ts tests/unit/composables/usePermisosGanado.spec.ts
git commit -m "feat: agregar composable de permisos de ganado por rol"
```

---

### Task 3: Frontend — cliente API para actualizar estado de salud

**Files:**
- Modify: `BovWeight-Movil/src/api/ganado.ts:65-67` (justo después de `registrarPeso`)

**Interfaces:**
- Consumes: `client` (axios instance) de `./client`, ruta `PATCH /ganado/{id}/estado-salud` de la Tarea 1.
- Produces: `actualizarEstadoSalud(id: number, estadoSaludId: number): Promise<Ganado>` — usado por la Tarea 6 (`DetalleGanadoPage.vue`).

No requiere test dedicado: el resto de funciones de `src/api/*.ts` en este proyecto son envoltorios delgados de axios sin cobertura de test propia (se verifican de forma indirecta a través del flujo manual de la Tarea 8); esta función sigue el mismo patrón exacto que `registrarPeso`.

- [ ] **Step 1: Agregar la función**

En `BovWeight-Movil/src/api/ganado.ts`, después de:

```ts
export const registrarPeso = async (id: number, peso: number): Promise<void> => {
  await client.post(`/ganado/${id}/peso`, { peso })
}
```

agregar:

```ts

export const actualizarEstadoSalud = async (id: number, estadoSaludId: number): Promise<Ganado> => {
  const response = await client.patch(`/ganado/${id}/estado-salud`, { estado_salud_id: estadoSaludId })
  return response.data.data
}
```

- [ ] **Step 2: Verificar que el proyecto compila**

Run: `cd BovWeight-Movil && npx vue-tsc --noEmit`
Expected: sin errores de tipo nuevos relacionados a `ganado.ts`.

- [ ] **Step 3: Commit**

```bash
cd BovWeight-Movil
git add src/api/ganado.ts
git commit -m "feat: agregar cliente API para actualizar estado de salud del ganado"
```

---

### Task 4: Frontend — restringir `AnimalesPage.vue` (lista de animales por finca)

**Files:**
- Modify: `BovWeight-Movil/src/views/fincas/AnimalesPage.vue`

**Interfaces:**
- Consumes: `usePermisosGanado()` de la Tarea 2 — usa `puedeAgregarGanado`, `puedeEditarCompleto`.

- [ ] **Step 1: Importar el composable**

En `AnimalesPage.vue`, después de la línea:

```ts
import { estimarPesoDesdeImagen, type MLEstimacion, type MLMedidas } from '@/api/ml'
```

agregar:

```ts
import { usePermisosGanado } from '@/composables/usePermisosGanado'
```

- [ ] **Step 2: Usar el composable**

Después de:

```ts
const route = useRoute()
const router = useRouter()
const fincaId = Number(route.params.fincaId)
```

agregar:

```ts
const { puedeAgregarGanado, puedeEditarCompleto } = usePermisosGanado()
```

- [ ] **Step 3: Ocultar el botón "..." (Editar/Eliminar) para quien no tiene permiso**

Reemplazar:

```html
            <ion-button slot="end" fill="clear" @click.stop="abrirOpciones(animal)">
              <ion-icon :icon="ellipsisVertical" />
            </ion-button>
```

por:

```html
            <ion-button v-if="puedeEditarCompleto" slot="end" fill="clear" @click.stop="abrirOpciones(animal)">
              <ion-icon :icon="ellipsisVertical" />
            </ion-button>
```

- [ ] **Step 4: Ocultar el FAB "+" para quien no tiene permiso**

Reemplazar:

```html
      <ion-fab v-if="!modoSeleccion" vertical="bottom" horizontal="end" slot="fixed">
```

por:

```html
      <ion-fab v-if="!modoSeleccion && puedeAgregarGanado" vertical="bottom" horizontal="end" slot="fixed">
```

- [ ] **Step 5: Verificar que el proyecto compila**

Run: `cd BovWeight-Movil && npx vue-tsc --noEmit`
Expected: sin errores de tipo.

- [ ] **Step 6: Commit**

```bash
cd BovWeight-Movil
git add src/views/fincas/AnimalesPage.vue
git commit -m "feat: ocultar agregar/editar ganado al veterinario en AnimalesPage"
```

---

### Task 5: Frontend — restringir `MiGanadoPage.vue` (búsqueda global)

**Files:**
- Modify: `BovWeight-Movil/src/views/ganado/MiGanadoPage.vue`

**Interfaces:**
- Consumes: `usePermisosGanado()` de la Tarea 2 — usa `puedeEditarCompleto`.

- [ ] **Step 1: Importar el composable**

En `MiGanadoPage.vue`, después de:

```ts
import { exportarPDF, exportarExcel } from '@/utils/exportarGanado'
```

agregar:

```ts
import { usePermisosGanado } from '@/composables/usePermisosGanado'
```

- [ ] **Step 2: Usar el composable**

Después de:

```ts
const router = useRouter()
```

agregar:

```ts
const { puedeEditarCompleto } = usePermisosGanado()
```

- [ ] **Step 3: Ocultar el botón "..." (Editar/Eliminar)**

Reemplazar:

```html
            <ion-button slot="end" fill="clear" @click.stop="abrirOpciones(animal)">
              <ion-icon :icon="ellipsisVertical" />
            </ion-button>
```

por:

```html
            <ion-button v-if="puedeEditarCompleto" slot="end" fill="clear" @click.stop="abrirOpciones(animal)">
              <ion-icon :icon="ellipsisVertical" />
            </ion-button>
```

- [ ] **Step 4: Verificar que el proyecto compila**

Run: `cd BovWeight-Movil && npx vue-tsc --noEmit`
Expected: sin errores de tipo.

- [ ] **Step 5: Commit**

```bash
cd BovWeight-Movil
git add src/views/ganado/MiGanadoPage.vue
git commit -m "feat: ocultar editar ganado al veterinario en MiGanadoPage"
```

---

### Task 6: Frontend — restringir y ampliar `DetalleGanadoPage.vue`

**Files:**
- Modify: `BovWeight-Movil/src/views/ganado/DetalleGanadoPage.vue`

**Interfaces:**
- Consumes: `usePermisosGanado()` de la Tarea 2 (`puedeEditarCompleto`, `puedeEditarEstadoSalud`, `campoEstadoPrincipal`); `actualizarEstadoSalud(id, estadoSaludId)` de la Tarea 3.

- [ ] **Step 1: Importar el composable y la función de API**

Reemplazar:

```ts
import {
  getGanado,
  updateGanado,
  registrarPeso,
  getEstadosSalud,
  getEstadosComerciales,
  type Ganado,
  type Catalogo,
} from '@/api/ganado'
import { getFincas, type Finca } from '@/api/fincas'
import { estimarPesoDesdeImagen, type MLEstimacion } from '@/api/ml'
import { alertController, actionSheetController } from '@ionic/vue'
```

por:

```ts
import {
  getGanado,
  updateGanado,
  registrarPeso,
  getEstadosSalud,
  getEstadosComerciales,
  actualizarEstadoSalud,
  type Ganado,
  type Catalogo,
} from '@/api/ganado'
import { getFincas, type Finca } from '@/api/fincas'
import { estimarPesoDesdeImagen, type MLEstimacion } from '@/api/ml'
import { alertController, actionSheetController } from '@ionic/vue'
import { usePermisosGanado } from '@/composables/usePermisosGanado'
```

- [ ] **Step 2: Usar el composable**

Después de:

```ts
const animal = ref<Ganado | null>(null)
const loading = ref(false)
```

agregar:

```ts
const { puedeEditarCompleto, puedeEditarEstadoSalud, campoEstadoPrincipal } = usePermisosGanado()
```

- [ ] **Step 3: Agregar la función que abre el selector de estado de salud**

Después de la función `abrirEditar()` (que termina en `showModal.value = true` seguido de `}`), agregar:

```ts
async function abrirSelectorEstadoSalud() {
  if (!puedeEditarEstadoSalud.value || !animal.value) return

  const sheet = await actionSheetController.create({
    header: 'Estado de salud',
    buttons: [
      ...estadosSalud.value.map((estado) => ({
        text: estado.nombre,
        handler: async () => {
          try {
            animal.value = await actualizarEstadoSalud(animal.value!.id, estado.id)
          } catch (e: any) {
            const alert = await alertController.create({
              header: 'No se pudo actualizar',
              message: e?.response?.data?.message ?? 'Ocurrió un error al actualizar el estado de salud.',
              buttons: ['OK'],
            })
            await alert.present()
          }
        },
      })),
      { text: 'Cancelar', role: 'cancel' },
    ],
  })
  await sheet.present()
}
```

- [ ] **Step 4: Ocultar el ícono de editar completo en el header**

Reemplazar:

```html
          <ion-button fill="clear" :disabled="!animal" @click="abrirEditar">
            <ion-icon :icon="createOutline" />
          </ion-button>
```

por:

```html
          <ion-button v-if="puedeEditarCompleto" fill="clear" :disabled="!animal" @click="abrirEditar">
            <ion-icon :icon="createOutline" />
          </ion-button>
```

- [ ] **Step 5: Intercambiar estado comercial por estado de salud en la columna ESTADO**

Reemplazar:

```html
            <div class="info-col">
              <div class="info-titulo">ESTADO</div>
              <div class="info-valor">{{ animal.estado_comercial?.nombre ?? '—' }}</div>
              <div class="info-sub">
                <span class="dot dot-verde" />
                {{ animal.estado_salud?.nombre ?? '—' }}
              </div>
            </div>
```

por:

```html
            <div
              class="info-col"
              :class="{ 'info-col-tocable': puedeEditarEstadoSalud }"
              @click="puedeEditarEstadoSalud ? abrirSelectorEstadoSalud() : undefined"
            >
              <div class="info-titulo">ESTADO</div>
              <div class="info-valor">{{ animal[campoEstadoPrincipal]?.nombre ?? '—' }}</div>
              <div class="info-sub">
                <span class="dot" :class="puedeEditarEstadoSalud ? 'dot-azul' : 'dot-verde'" />
                {{ puedeEditarEstadoSalud ? 'Toca para cambiar' : (animal.estado_salud?.nombre ?? '—') }}
              </div>
            </div>
```

- [ ] **Step 6: Agregar el estilo de la columna tocable y el punto azul**

En el bloque `<style scoped>`, después de:

```css
.dot-verde {
  background: #43a047;
}
```

agregar:

```css
.dot-azul {
  background: #1e88e5;
}

.info-col-tocable {
  cursor: pointer;
}
```

- [ ] **Step 7: Verificar que el proyecto compila**

Run: `cd BovWeight-Movil && npx vue-tsc --noEmit`
Expected: sin errores de tipo.

- [ ] **Step 8: Commit**

```bash
cd BovWeight-Movil
git add src/views/ganado/DetalleGanadoPage.vue
git commit -m "feat: permitir al veterinario editar estado de salud en DetalleGanadoPage"
```

---

### Task 7: Frontend — quitar tarjeta "Estimar Peso" del home del veterinario

**Files:**
- Modify: `BovWeight-Movil/src/views/home/HomeVeterinarioPage.vue`

- [ ] **Step 1: Quitar la tarjeta del template**

Reemplazar:

```html
        <div class="module-card coming-soon">
          <ion-icon :icon="cameraOutline" class="module-icon" />
          <p class="module-label">Estimar Peso</p>
          <ion-badge color="medium" class="module-badge">Próximamente</ion-badge>
        </div>

        <button class="module-card" type="button" @click="goToHistorial">
```

por:

```html
        <button class="module-card" type="button" @click="goToHistorial">
```

- [ ] **Step 2: Quitar el import de ícono que ya no se usa**

Reemplazar:

```ts
import {
  logOutOutline, medkitOutline, businessOutline,
  pawOutline, cameraOutline, barChartOutline, informationCircleOutline,
} from 'ionicons/icons'
```

por:

```ts
import {
  logOutOutline, medkitOutline, businessOutline,
  pawOutline, barChartOutline, informationCircleOutline,
} from 'ionicons/icons'
```

- [ ] **Step 3: Verificar que el proyecto compila y que el lint no marca el ícono como no usado**

Run: `cd BovWeight-Movil && npx vue-tsc --noEmit && npx eslint src/views/home/HomeVeterinarioPage.vue`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
cd BovWeight-Movil
git add src/views/home/HomeVeterinarioPage.vue
git commit -m "feat: quitar tarjeta Estimar Peso del inicio del veterinario"
```

---

### Task 8: Verificación manual end-to-end

**Files:** ninguno (solo verificación, no produce cambios de código).

- [ ] **Step 1: Levantar el backend**

Run: `cd Bovweightcr-API && php artisan serve`

- [ ] **Step 2: Levantar el frontend**

Run: `cd BovWeight-Movil && npm run dev`

- [ ] **Step 3: Verificar el flujo del veterinario**

Con un usuario de tipo Veterinario, asignado a al menos una finca con animales:
1. Entrar a "Fincas Asignadas" → abrir una finca → confirmar que NO aparece el botón "+" ni el botón "..." en la lista de animales, solo "Seleccionar".
2. Entrar a "Mi Ganado" (búsqueda) → confirmar que NO aparece el botón "...".
3. Tocar "Seleccionar" en un animal → en el detalle, confirmar que NO aparece el ícono de lápiz en el header.
4. En el detalle, confirmar que la columna "ESTADO" muestra el estado de salud (no el comercial) y dice "Toca para cambiar".
5. Tocar la columna "ESTADO" → elegir un estado distinto en el action sheet → confirmar que se actualiza en pantalla y persiste al recargar.
6. En el inicio del veterinario, confirmar que NO aparece la tarjeta "Estimar Peso".
7. Confirmar que "Reportes" sigue funcionando igual que antes.

- [ ] **Step 4: Verificar que el ganadero no tuvo regresiones**

Con un usuario de tipo Ganadero:
1. Agregar un animal nuevo a una finca (FAB "+") — debe funcionar igual que antes, incluyendo "Estimar peso con IA" dentro del modal.
2. Editar un animal existente (botón "...") — debe poder cambiar arete, nombre, raza, finca, estado comercial y foto, igual que antes.
3. Eliminar un animal — debe funcionar igual que antes.
4. Confirmar que no existe ninguna forma en la UI de cambiar el estado de salud como ganadero.

- [ ] **Step 5: Verificar el rechazo del backend ante intentos directos**

Con un token de un veterinario NO asignado a la finca del animal, hacer:

```bash
curl -X PATCH http://localhost:8000/api/ganado/<id>/estado-salud \
  -H "Authorization: Bearer <token_del_veterinario_no_asignado>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"estado_salud_id": 1}'
```

Expected: HTTP 403.

- [ ] **Step 6: Confirmar con el usuario**

Reportar los resultados de los pasos 3-5 al usuario antes de considerar el trabajo terminado.
