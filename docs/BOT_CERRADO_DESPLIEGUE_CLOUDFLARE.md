# Desplegar el Copiloto con Cloudflare Workers (gratis, sin tarjeta)

Todo el código ya está escrito y copiado a tu carpeta (`cloudflare-worker/` y `src/components/AICopilot.jsx` actualizado). Estos son los pasos que solo tú puedes hacer, en orden. Ninguno pide tarjeta de crédito.

## 1. Crear cuenta gratuita de Cloudflare

- Entra a https://dash.cloudflare.com/sign-up, regístrate con tu correo. No pide tarjeta para el plan gratuito de Workers.

## 2. Instalar las dependencias del Worker

En tu terminal:
```
cd C:\Users\josem\Downloads\SO-AR\cloudflare-worker
npm install
```

## 3. Conectar Wrangler (la herramienta de Cloudflare) con tu cuenta

```
npx wrangler login
```
Se abre el navegador para que autorices — acepta.

## 4. Crear una Service Account de Google con acceso mínimo a Firestore

Este es el paso más delicado — es una credencial con acceso a tu base de datos, hay que crearla con permisos limitados y cuidarla:

1. Ve a https://console.cloud.google.com/iam-admin/serviceaccounts y selecciona el proyecto **centro-operativo-cpsl** (arriba a la izquierda).
2. **Crear cuenta de servicio** → nombre: `copiloto-worker` → Crear y continuar.
3. En "Otorgar acceso": rol **Cloud Datastore User** (`roles/datastore.user`) — es el mínimo necesario para leer/escribir Firestore, no le des ningún otro rol. → Continuar → Listo.
4. Entra a la cuenta de servicio recién creada → pestaña **Claves** → **Agregar clave** → **Crear clave nueva** → tipo **JSON** → Crear. Se descarga un archivo `.json` a tu carpeta de Descargas.

⚠️ Ese archivo es una credencial real — no lo subas a GitHub, no lo compartas. En el paso 6 lo vamos a guardar de forma segura en Cloudflare, y después lo vamos a borrar de tu Descargas.

## 5. Guardar los secretos en Cloudflare (nunca en archivos del proyecto)

Sigue en la carpeta `cloudflare-worker`:

```
npx wrangler secret put GROQ_API_KEY
```
Te va a pedir que pegues el valor — pega tu key de Groq y Enter. (Si la que ya tienes en `.env` como `VITE_GROQ_API_KEY` sigue siendo válida, es esa misma, sin el prefijo `VITE_`.)

```
type "C:\Users\josem\Downloads\[nombre-del-archivo-que-se-descargó].json" | npx wrangler secret put FIREBASE_SERVICE_ACCOUNT_JSON
```
(Cambia el nombre del archivo por el que realmente se descargó en el paso 4.)

## 6. Borrar el archivo JSON descargado

Una vez hecho el paso anterior, borra ese archivo `.json` de tu carpeta de Descargas — ya está guardado de forma segura dentro de Cloudflare, no hace falta tenerlo suelto en el disco.

## 7. Desplegar el Worker

```
npx wrangler deploy
```
Al terminar, va a imprimir una URL parecida a `https://so-ar-copiloto.TU-SUBDOMINIO.workers.dev` — cópiala.

## 8. Conectar el frontend al Worker

Edita (o agrega si no existe) en `C:\Users\josem\Downloads\SO-AR\.env`:
```
VITE_COPILOTO_WORKER_URL=https://so-ar-copiloto.TU-SUBDOMINIO.workers.dev
```
(Con la URL real que te dio el paso 7.)

Luego, de vuelta en la carpeta principal del proyecto:
```
cd C:\Users\josem\Downloads\SO-AR
npm run build
firebase deploy --only hosting
```

## 9. Probar

Igual que con cualquier otro cambio: abre el sitio, refresco forzado (Ctrl+Shift+R), abre el Copiloto, escribe algo, revisa la consola (F12) si algo falla. Después, idealmente, prueba con una persona de cada rol (operativo, coordinador, gerencia) para confirmar que cada quien ve solo lo que le corresponde — el detalle está en `docs/BOT_CERRADO_DESPLIEGUE_PENDIENTE.md`, sección 4 (aplica igual aquí, cambiando "Cloud Function" por "Worker").

## Para actualizar el Worker más adelante

Si cambias `cloudflare-worker/src/index.js`, solo hace falta `npx wrangler deploy` de nuevo desde esa carpeta — no hace falta tocar los secretos otra vez.
