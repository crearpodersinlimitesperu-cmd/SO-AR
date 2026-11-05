# Guía local de Aliados C2

Prototipo separado de Causa OS. No modifica el login, el home, las reglas ni las rutas de la aplicación. No importa Firebase, no recoge datos personales y no utiliza analítica, fuentes remotas ni servicios externos.

Las secciones iniciales describen la guía temporal `main.jsx`. El frontend autenticado **solo local/demo**, añadido aparte en `private/local/`, se documenta al final y no cambia ese prototipo.

Desde la raíz del worktree:

```sh
npm exec vite -- --config prototypes/aliados-c2/vite.config.js
```

Abrir `http://127.0.0.1:4312/`. El servidor se limita al loopback y falla si el puerto está ocupado. No cambiarlo a `0.0.0.0` para compartir esta guía interna.

```sh
npm exec vite build -- --config prototypes/aliados-c2/vite.config.js
node --test tests/aliados-c2.test.mjs
```

El build separado se genera en `prototypes/aliados-c2/dist`, no en el `dist` de Causa OS. El build habitual con `npm exec vite build` no incluye este HTML. No usar `npm run build`: el prebuild del repositorio reescribe documentación ajena.

## Interacciones y contenido

Navegación por las cuatro fases mediante enlaces con hash y acceso a toda la agenda. Checklist con nueve acuerdos de preparación y borrado confirmado, ahora **solo como demostración temporal en memoria**. Consulta rápida desplegable. Impresión completa con todas las fases y notas de consulta, incluso si se está filtrando.

No hay persistencia de interacciones, cuentas, historial por usuario ni sincronización entre dispositivos. Se eliminó el uso de `localStorage` del primer prototipo: una clave compartida en un navegador **no es aislamiento por identidad**. Las marcas antiguas no se leen ni migran; se pueden borrar desde los datos del sitio. Las nuevas marcas se pierden al recargar/cerrar y no acreditan cumplimiento. La interfaz informa este límite antes del cronograma y junto a las casillas. La demostración funciona aunque el almacenamiento esté bloqueado; no pretende solucionar la persistencia de un servicio real.

El logo se copia sin modificar de `public/imo/logo-crear.png`; conserva el nombre y lema CREAR · Poder sin límites. No requiere un CDN. Los avisos de privacidad y propiedad intelectual son informativos para esta versión local, no un contrato ni una certificación de cumplimiento internacional. No se inventan titular jurídico, responsable del tratamiento ni contactos.

Fuente: adjunto “Guía Práctica Operativa: Aliado de Capítulo Dos (C2)”, 115 líneas. Se conserva la terminología y se reorganizan fases, horarios y misiones. La sección de conversaciones es una síntesis editorial: no reproduce instrucciones de presión ni presenta los nombres del programa como evidencia neurocientífica. Las notas de cuidado están identificadas y no pretenden modificar políticas del programa.

## Límite de publicación

crearpsl.net es un dominio solicitado, **no configurado ni publicado**. No se ha autorizado acceso público al contenido operativo. `noindex` es una señal para buscadores, **no un control de acceso**. Antes de publicar, definir y autorizar la audiencia, revisar el contenido y añadir acceso apropiado en el hosting. No desplegar este prototipo con el despliegue de Causa OS.

El 4 de noviembre de 2026, antes de recibir la retirada de autorización comunicada por los coordinadores, la respuesta observada a la pregunta de infraestructura llevó a crear el proyecto vacío `aliados-crear-global`. Se detuvo toda operación externa al recibir la retirada: no se configuraron base de datos, reglas, autenticación, facturación ni despliegue. No se almacenaron registros privados reales. No usar, modificar ni eliminar ese proyecto sin autorización expresa.

## Bloqueos de registro privado y despliegue

Faltan autorización operativa del destino, control del dominio, mecanismo aprobado para acreditar Aliados y responsables/avisos de privacidad. No se han desplegado cuentas ni servicios. Causa OS y el PR de privacidad #184 permanecen separados e intactos.

Para habilitar un registro real se necesita identidad verificada; autorización comprobada en servidor; reglas y pruebas negativas que impidan leer/escribir registros ajenos; eventos inmutables con hora de servidor; consistencia transaccional e idempotencia; estados claros de pendiente/confirmado/conflicto/error; recuperación y respaldo; cierre de sesión que limpie los datos del usuario previo; y política aprobada de conservación/exportación/supresión. Ninguna clave de navegador, nombre escrito o inicio de sesión aparente sustituye esos controles.

“Cualquier dispositivo” y “a prueba de errores” no se afirman como garantías absolutas. Se verifica diseño responsive, controles táctiles y teclado, zoom 200%, movimiento reducido, impresión y funcionamiento local con almacenamiento denegado. La certificación en navegadores reales Safari/Firefox y dispositivos físicos queda fuera de esa evidencia.

## Estado del servicio dedicado · 4 de noviembre de 2026

Con autorización posterior para Firebase Spark, sin vincular facturación:

- Entrada cerrada publicada en `https://aliados-crear-global.web.app/`, versión Hosting `4e948b48441d90df`. Verificada: HTTPS 200, headers de CSP/no-store/noindex, logo cargado, sin formularios/scripts/registro; `/content.js` y `/main.jsx` responden 404. No incluye la guía interna.
- App web dedicada `1:803494420111:web:bb2fd8fcb92bfce9b31afa`.
- APIs de Firestore y Authentication habilitadas solo en `aliados-crear-global`.
- Base de datos `(default)` creada en `nam5`, edición Standard, `freeTier: true`, protección contra borrado habilitada y PITR deshabilitado. No se activó billing ni se guardaron registros de Aliados.
- Authentication **no inicializado**, respuesta verificada `404 CONFIGURATION_NOT_FOUND`. La respuesta observada a la pregunta de consola fue retirada por el coordinador; no se considera confirmación. No se ejecutó `identityPlatform:initializeAuth`, que requiere billing.
- `private/firebase.json` configura exclusivamente `closed.rules`, que deniega todas las lecturas/escrituras de cliente. El candidato `private/firestore.rules` y el modelo de acciones **no están habilitados para datos reales**; las pruebas negativas de emulador pasaron, pero falta integración de identidad.

El correo designado por el usuario para administración es `sistemas@crearpsl.net`; aún no está autenticado/verificado en el proyecto. No se crearon sus credenciales ni se lo suplantó. Inicializar Authentication gratuitamente desde la consola, verificar esa identidad y aprobar el aviso legal siguen siendo requisitos para habilitar acceso. El primer paso no autoriza invitar personas automáticamente.

Esta entrada en línea no equivale a un servicio operativo de guía privada, progreso o trazabilidad. `crearpsl.net` no fue configurado. Causa OS y #184 no fueron modificados.

Verificación adicional: Cloud Billing informó `billingEnabled: false`; una lectura REST sin autenticar de `content/c2-v1` respondió `403 PERMISSION_DENIED` tras desplegar las reglas cerradas. No hay prueba positiva de acceso de un Aliado porque Authentication no está inicializado.

Pruebas locales del modelo de acciones y configuración cerrada:

```sh
node --test tests/aliados-c2-private-model.test.mjs tests/aliados-c2-closed-rules.test.mjs tests/aliados-c2-hosting.test.mjs
```

Se incluyen pruebas sintéticas del **candidato** de reglas para UID ajeno, correo no verificado, aprobación, revocación y estado/historial atómicos. Se ejecutaron en el emulador local `demo-aliados-c2` con un runtime JDK 21 compartido por la sesión coordinadora: **6 pruebas aprobadas, cero fallos y cero omitidas**. El emulador se apagó al finalizar; no se contactaron servicios del proyecto real para esta validación. El runner informa explícitamente `skip` si no hay emulador. Con un runtime Java compatible se pueden reproducir:

```sh
firebase emulators:exec --only firestore --config prototypes/aliados-c2/private/emulator.json --project demo-aliados-c2 "node --test tests/aliados-c2-private-emulator.test.mjs"
```

La prueba verificó aprobación por administrador exacto y verificado; rechazo de autoaprobación, identidad no aprobada/no verificada y correo inconsistente; estado e historial escritos juntos; rechazo de historial editado/borrado, revisión obsoleta y acciones que alteran acuerdos ajenos; rechazo de acceso cruzado entre UID y revocación efectiva.

No desplegar `private/firestore.rules` por haber pasado estas pruebas: falta integración con Authentication **real**. La integración y el cambio de cuenta descritos a continuación existen únicamente en emuladores demo locales; no habilitan datos reales. Las reglas desplegadas siguen siendo `closed.rules`; no se habilitó acceso ni se publicó otra versión.

## Frontend privado LOCAL · integración demo, 4 de noviembre de 2026

La superficie nueva está en `private/local/`, completamente separada de `main.jsx` (la guía temporal original sigue sin Auth/Firebase), de la entrada publicada en `hosting/` y de Causa OS. No se modifica el HTML público ni se sirve el documento operativo real. El build independiente queda en `private/local/dist`, ignorado por Git y **no configurado para Hosting**.

### Contrato y aislamiento

- Solo admite `demo-aliados-c2` y hostname loopback; `VITE_C2_PROJECT_ID` distinto, aunque sea otro `demo-*`, causa bloqueo antes de inicializar Firebase. Auth usa exclusivamente `127.0.0.1:9198`; Firestore, `127.0.0.1:8198`. No hay API key real, proveedor OAuth, producción alternativa, configuración del proyecto real, registro de cuentas ni envío de correos desde el frontend.
- Login real del **emulador Auth** con contraseña sintética y persistencia en memoria. Token con correo verificado y documento `members/{uid}` obtenido del servidor: `enabled === true` y correo exactamente igual al del token. El frontend no permite autoaprobarse. No convierte un correo escrito en autoridad.
- Solo después de esa comprobación se suscribe a `content/c2-v1`, `records/{uid}` e historial propio. Ignora snapshots de caché y escrituras pendientes para declarar autoridad/datos confirmados. La guía recibida exige versión, título, aviso, cuatro fases, nueve acuerdos y cuatro referencias válidas; contenido ausente/malformado es error, nunca fallback a `content.js`.
- `fixtures.mjs` es una herramienta de seed **fuera del grafo del frontend**. Guarda únicamente texto ficticio explícitamente rotulado; nunca importa/sube `content.js`. Su guardia exige `GCLOUD_PROJECT` demo exacto y ambas direcciones de emulador exactas antes de inicializar Admin SDK. Desactiva detección de metadata cloud. La única identidad de admin con el correo exacto de las reglas es `fixture-admin`, exclusivamente sintética en Auth demo.
- Preparación, fase, consulta y reset producen una transacción: relee aprobación/estado, calcula revisión, usa un ID de evento estable durante los reintentos y escribe estado + evento inmutable con timestamp de servidor. No hace updates optimistas ni confirma antes del commit. Reset tiene confirmación y conserva historial. Errores requieren cerrar sesión y reentrar; las transacciones fallidas no se presentan como éxito.
- Logout/cambio de cuenta retira inmediatamente datos de la vista, suscripciones privadas, fase, consulta y mensajes del UID previo. Generaciones de sesión/identidad descartan callbacks tardíos. Revocación de miembro/correo distinto limpia del mismo modo. Se revalida Auth al foco y cada 30 segundos; pérdida del correo verificado observada en un token nuevo bloquea el acceso.
- Sesión y caché no se persisten en disco ni migran marcas compartidas. No se garantiza borrado forense de la memoria del SDK: la garantía comprobada es aislamiento de vista/callbacks y ausencia de persistencia propia. Una transacción ya enviada puede terminar en el UID original tras salir; su resultado no aparece en la cuenta nueva. La cola del SDK puede retrasar la carga de la cuenta nueva hasta completar esa solicitud. No puede retirar capturas/copias previas ni detectar instantáneamente una revocación mientras no existe conectividad.

### Reproducir sin consola, servicios reales ni publicación

Desde la raíz, con Java 21 compatible en `JAVA_HOME` y su `bin` al principio de `PATH`:

```sh
# Ejecuta navegador + reglas secuencialmente: ambas usan el mismo proyecto demo.
firebase emulators:exec --only auth,firestore \
  --config prototypes/aliados-c2/private/emulator.json --project demo-aliados-c2 \
  "node --test --test-concurrency=1 tests/aliados-c2-private-emulator.test.mjs tests/aliados-c2-local-browser.test.mjs"

# Build aislado; no ejecutar npm run build.
npm exec vite build -- --config prototypes/aliados-c2/private/local/vite.config.js
node --test tests/aliados-c2-local.test.mjs tests/aliados-c2-private-model.test.mjs \
  tests/aliados-c2-closed-rules.test.mjs tests/aliados-c2-hosting.test.mjs tests/aliados-c2.test.mjs
```

Para inspección manual, iniciar **únicamente** ambos emuladores con el mismo config/demo, sembrar fixtures y abrir Vite en otro terminal:

```sh
firebase emulators:start --only auth,firestore \
  --config prototypes/aliados-c2/private/emulator.json --project demo-aliados-c2

GCLOUD_PROJECT=demo-aliados-c2 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9198 \
  FIRESTORE_EMULATOR_HOST=127.0.0.1:8198 node prototypes/aliados-c2/private/fixtures.mjs
npm exec vite -- --config prototypes/aliados-c2/private/local/vite.config.js
```

Abrir `http://127.0.0.1:4313/`, no el servidor temporal original `4312`. Ambos puertos de emulador y Vite deben estar libres; no detener servicios ajenos para ocuparlos. Los usuarios están en `fixtureUsers` y la contraseña ficticia en `fixturePassword`, exclusivamente para demo. El seed restaura esos seis UID y borra **solo sus registros/eventos sintéticos**. No usarlo mientras otra prueba comparte ese proyecto. No usar `--export-on-exit`, no importar dumps reales. Detener Vite/emuladores al terminar. Si falta un emulador, el runner informa `skip`; eso **no** cuenta como validación aprobada.

### Evidencia y límites verificados

- Puppeteer/Chromium: **8/8** (suite + siete escenarios), cero fallos/omitidos. Anonymous/noverificado no solicitan Firestore; noaprobado/correo inconsistente no reciben guía. X guarda estado/historial con la misma hora de servidor, recupera marcas tras nuevo login, registra fase/consulta/reset. Y no lee estado/eventos X; cambio de cuenta limpia controles, historial y callbacks X.
- Admin sintético exacto y verificado revoca Y mediante SDK cliente sujeto a reglas; la vista se limpia y se deniegan lecturas/escrituras posteriores. Pérdida de verificación Auth limpia tras refresh. Una transacción X retenida en red termina después del logout/login Y sin contaminar vista ni mensaje Y.
- Guía/registro inválidos y contraseña errónea producen error explícito. Un **fallo de red inyectado por Puppeteer** aborta los commits/reintentos del SDK; no se crea registro/evento ni se anuncia guardado. No se atribuye ese aborto a una caída real del emulador.
- Reglas candidatas: **6/6**, cero fallos/omitidos; UID ajeno, invitación/aprobación exacta, rechazo de autoaprobación/admin incorrecto/no verificado, revisión obsoleta, inmutabilidad y transacción atómica. No cambia `firestore.rules` ni la configuración de despliegue deny-all.
- Modelo/configuración/build/guía original: **12/12**, cero fallos/omitidos. El test de build inspecciona los chunks y confirma exclusión de texto operativo, texto de fixture, contraseña sintética y correo de admin. Vite build separado satisfactorio; advertencia informativa de chunk Firebase/React ~733 kB (~221 kB gzip). Oxlint dirigido sin errores/advertencias.
- Capturas desktop 1440 px y móvil 390 px en `tests/artifacts.local/c2-private-{desktop,mobile}.png` (ignoradas por Git); cero solicitudes externas ni errores JS de página observados. Móvil sin overflow horizontal. Se conserva mundo azul/dorado y tipografía de sistema. Detector visual: falso positivo de borde/redondeado (form/aside son cuadrados); tamaños secundarios heredados y rojo de error con contraste son elecciones locales, no cambios del sistema global. Sidecar visual preexistente desactualizado no se reescribe en esta tarea.
- JDK 21 compartido usado solo como runtime; no se copiaron archivos de otro checkout. Tests cierran navegador, Vite, clientes SDK y emuladores. No se ejecutaron deploy, push/PR, habilitación de servicios, billing, operaciones de DNS ni APIs/cuentas del proyecto real.

**Pendientes reales:** inicializar Authentication con autorización y sin billing, verificar administrador real `sistemas@crearpsl.net`, definir/aprobar invitaciones reales y responsables/aviso legal (conservación, derechos, transferencias), control DNS y autorización específica de publicación. También faltan contrato/migración de la guía real, operación de respaldo/recuperación y certificación en Safari/Firefox/dispositivos físicos. Este frontend local no es un servicio privado de producción ni una integración de la guía real.
