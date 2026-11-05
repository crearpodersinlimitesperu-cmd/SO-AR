# Guía local de Aliados C2

Prototipo separado de Causa OS. No modifica el login, el home, las reglas ni las rutas de la aplicación. No importa Firebase, no recoge datos personales y no utiliza analítica, fuentes remotas ni servicios externos.

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

No desplegar `private/firestore.rules` por haber pasado estas pruebas: falta integración con Authentication. El cambio de UID se probó en las reglas, **no** como cambio de cuenta de un frontend real. Tampoco hay frontend autenticado, recuperación de sincronización o prueba de limpieza real al cambiar cuenta; el candidato es preparatorio, no una implementación completa de esas funciones. Las reglas desplegadas siguen siendo `closed.rules`; no se habilitó acceso ni se publicó otra versión.
