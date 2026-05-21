# BovWeight CR — App Móvil

Aplicación móvil para la estimación de peso de ganado bovino mediante fotografías. Desarrollada para el curso IF7100 Ingeniería del Software, UCR Sede Guanacaste.

**Stack:** Ionic 8 · Vue 3 · TypeScript · Capacitor 8 · Pinia · Axios

---

## Requisitos previos

- Node.js 18+ y npm
- [Ionic CLI](https://ionicframework.com/docs/cli): `npm install -g @ionic/cli`
- El backend `Bovweightcr-API` corriendo en local (ver su README)
- **Para Android:** Android Studio con SDK y un emulador/dispositivo configurado
- **Para iOS:** macOS con Xcode instalado (solo en Mac)

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd BovWeight-Movil
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_API_URL=http://localhost:8000/api
```

> Si vas a probar en un **dispositivo físico**, reemplaza `localhost` por la IP de tu máquina en la red local (ej: `http://192.168.1.100:8000/api`). El dispositivo y la computadora deben estar en la misma red.

---

## Desarrollo en el navegador

Para probar la app en el navegador sin necesidad de un emulador:

```bash
npm run dev
```

Abre `http://localhost:5173` en tu navegador.

---

## Correr en emulador o dispositivo

### Android

```bash
# Build y sincronizar con el proyecto Android nativo
npm run build
npx cap sync android

# Abrir en Android Studio (para elegir emulador/dispositivo)
npx cap open android

# O correr directamente (requiere un emulador o dispositivo conectado)
npx cap run android
```

### iOS (solo macOS)

```bash
npm run build
npx cap sync ios
npx cap open ios
```

---

## Comandos útiles

```bash
# Servidor de desarrollo en el navegador
npm run dev

# Build de producción
npm run build

# Sincronizar cambios con Android/iOS después de un build
npx cap sync

# Ver la app en vivo con hot-reload en dispositivo (requiere Ionic CLI)
ionic cap run android --livereload --external

# Ejecutar tests unitarios
npm run test:unit

# Ejecutar tests e2e con Cypress
npm run test:e2e

# Lint del código
npm run lint
```

---

## Estructura del proyecto

```
src/
├── api/
│   ├── client.ts          # Instancia axios + interceptores (auth token, 401 handler)
│   ├── auth.ts            # Endpoints de autenticación
│   └── solicitudes.ts     # Endpoint de solicitud de registro
├── composables/
│   └── useToast.ts        # Wrapper de IonToast
├── router/
│   └── index.ts           # Rutas + navigation guards
├── stores/
│   └── auth.ts            # Pinia store de autenticación
├── theme/
│   └── variables.css      # Tema verde agrícola + overrides Ionic
├── types/
│   └── index.ts           # Interfaces TypeScript globales
└── views/
    ├── auth/              # Login, Registro, Recuperar contraseña
    ├── home/              # Página principal
    ├── perfil/            # Perfil del usuario
    └── tabs/              # Navegación por tabs
```

---

## Flujo de autenticación

El registro no es directo: el usuario envía una **solicitud de registro** (sin contraseña). Un administrador la aprueba desde el panel web (`BovWeight-Web`). Al aprobar, el sistema envía las credenciales al correo del solicitante.

```
Registro → Solicitud pendiente → Admin aprueba → Correo con credenciales → Login
```

---

## Rutas de la app

| Ruta | Componente | Acceso |
|---|---|---|
| `/login` | `LoginPage` | Solo no autenticados |
| `/register` | `RegisterPage` | Solo no autenticados |
| `/forgot-password` | `ForgotPasswordPage` | Solo no autenticados |
| `/reset-password` | `ResetPasswordPage` | Solo no autenticados |
| `/tabs/home` | `HomePage` | Requiere autenticación |
| `/tabs/perfil` | `PerfilPage` | Requiere autenticación |

---

## Proyectos relacionados

| Proyecto | Descripción |
|---|---|
| `Bovweightcr-API` | Backend Laravel 13 — debe estar corriendo para que la app funcione |
| `BovWeight-Web` | Panel administrativo Vue 3 — gestión de usuarios y solicitudes |
