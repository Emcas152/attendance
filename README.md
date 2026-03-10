# Attendance

Sistema de control de asistencia con React, Vite, Express y Firebase Firestore.

## Requisitos

- Node.js 20 o superior
- Cloud Firestore habilitado en el proyecto `asistencia-7fbf5`
- Credenciales de servicio de Firebase para el backend o credenciales por defecto del entorno

## Variables de entorno

Este proyecto usa las variables definidas en [.env.example](.env.example).

### Frontend

Las variables `VITE_FIREBASE_*` se usan en el navegador para inicializar Firebase y Analytics.

### Backend

El servidor Express usa `firebase-admin` para acceder a Firestore.

Puedes configurarlo de dos maneras:

1. Definir `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` y `FIREBASE_PROJECT_ID`.
2. Usar credenciales por defecto del entorno, por ejemplo en GCP o con `GOOGLE_APPLICATION_CREDENTIALS`.

Para desarrollo local:

1. Usa [.env](.env) con tus valores.
2. Si pones la clave privada en `.env`, guarda el valor escapando saltos de línea como `\n`.
3. Si cambias credenciales web, actualiza también las variables `VITE_`.

## Desarrollo local

```bash
npm install
npm run dev
```

## Build de producción

```bash
npm run build
npm start
```

El build genera:

- `dist/public` para el frontend
- `dist/index.cjs` para el servidor Express

## Frontend y backend separados

El frontend puede desplegarse de forma independiente en Firebase Hosting.

El backend puede desplegarse aparte en Render, Railway, Cloud Run u otro servicio Node.

### Variables clave para la separación

- `VITE_API_BASE_URL`: URL pública del backend, por ejemplo `https://attendance-api.onrender.com`
- `CORS_ORIGIN`: origen permitido para el frontend, por ejemplo `https://asistencia-7fbf5.web.app`

### Desarrollo local separado

Frontend:

```bash
npm run dev
```

Backend:

- corre en `http://localhost:5000`
- el frontend usa `VITE_API_BASE_URL`

### Deploy del frontend en Firebase Hosting

1. Ajusta `VITE_API_BASE_URL` al dominio real de tu backend.
2. Ejecuta:

```bash
npm run build
firebase deploy --only hosting
```

3. Firebase publicará el contenido de `dist/public` usando [firebase.json](firebase.json).

### Deploy del backend por separado

Despliega el backend Node en un servicio externo y define al menos estas variables:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_CLIENT_EMAIL` o credenciales por defecto del entorno
- `FIREBASE_PRIVATE_KEY` o credenciales por defecto del entorno
- `CORS_ORIGIN`

### Deploy del backend en Coolify

Este repo ya incluye [Dockerfile](Dockerfile) para desplegar solo la API en Coolify.

Pasos en Coolify:

1. Crea un nuevo recurso desde repositorio Git.
2. Selecciona Dockerfile como método de despliegue.
3. Usa la raíz del proyecto como contexto.
4. Expón el puerto `5000`.
5. Configura health check en `/health`.
6. Agrega estas variables de entorno:

- `PORT=5000`
- `SERVE_STATIC=false`
- `CORS_ORIGIN=https://tu-frontend.web.app`
- `FIREBASE_PROJECT_ID=asistencia-7fbf5`
- `FIREBASE_STORAGE_BUCKET=asistencia-7fbf5.firebasestorage.app`
- `FIREBASE_CLIENT_EMAIL=...`
- `FIREBASE_PRIVATE_KEY=...`

Si tu proveedor de infraestructura para Coolify ya entrega credenciales por defecto a Google Cloud, puedes omitir `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY`. En la mayoría de instalaciones de Coolify no ocurre, así que normalmente sí debes configurarlas.

Comandos equivalentes fuera de Coolify:

```bash
npm run build:backend
npm run start:backend
```

## Deploy en Firebase

Si no quieres separar frontend y backend, la opción recomendada sigue siendo Firebase App Hosting, porque la app usa React, Vite y un backend Express en el mismo proyecto.

Este repo ya incluye [apphosting.yaml](apphosting.yaml) y [.firebaserc](.firebaserc).

### Requisitos para Firebase App Hosting

- Proyecto Firebase en plan Blaze
- Firestore habilitado
- Repositorio subido a GitHub
- Firebase CLI 13.15.4 o superior

### Flujo recomendado

1. Asegúrate de que el repositorio en GitHub esté actualizado.
2. Entra a Firebase Console.
3. Abre `Build` -> `App Hosting`.
4. Crea un backend nuevo.
5. Conecta el repositorio GitHub.
6. Usa `/` como root directory.
7. Selecciona la rama principal que quieras desplegar.

Firebase App Hosting tomará [apphosting.yaml](apphosting.yaml), ejecutará `npm run build` y levantará la app con `npm start`.

### Opción por CLI

Si ya estás autenticado en Firebase CLI, puedes crear el backend con:

```bash
firebase apphosting:backends:create --project asistencia-7fbf5
```

Después sigue los prompts para elegir región, conectar GitHub y seleccionar la rama.

### Variables en App Hosting

Las variables públicas del frontend ya están definidas en [apphosting.yaml](apphosting.yaml).

Para el backend en App Hosting normalmente no necesitas `FIREBASE_CLIENT_EMAIL` ni `FIREBASE_PRIVATE_KEY`, porque el entorno administrado por Google puede usar credenciales por defecto mediante `firebase-admin`.

Si decides usar secretos explícitos, configúralos en Firebase App Hosting o Secret Manager, no en Git.

## Deploy en Render

Este repo ya incluye [render.yaml](render.yaml).

### Opción recomendada: Blueprint

1. Sube este proyecto a GitHub.
2. En Render, entra a `New +` -> `Blueprint`.
3. Selecciona el repositorio.
4. Render leerá [render.yaml](render.yaml) y creará el servicio.
5. Completa manualmente las variables marcadas como `sync: false` con los valores de [.env.example](.env.example).
6. Para el backend, agrega también `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY` si no vas a usar credenciales administradas por GCP.
7. Despliega.

### Variables requeridas en Render

- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

Las variables `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID` y `FIREBASE_MEASUREMENT_ID` pueden mantenerse si quieres conservar una sola fuente de configuración, pero el backend ya no depende de ellas para autenticarse contra Firestore.

## Notas importantes

- `.env` está ignorado por Git en [.gitignore](.gitignore).
- Si Firestore no está habilitado en Google Cloud, la app va a iniciar pero las rutas `/api/*` fallarán al consultar datos.
- Si el backend no tiene credenciales válidas de `firebase-admin`, el servidor arrancará pero fallará al leer o escribir en Firestore.