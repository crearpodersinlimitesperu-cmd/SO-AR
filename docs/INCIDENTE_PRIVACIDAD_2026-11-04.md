# Incidente de privacidad: perfiles, sedes e identidades

## Estado y alcance

**Incidente abierto. Este PR es un endurecimiento reproducido, no una confirmación
de la causa del reporte ni una declaración de aislamiento completo. No desplegar
las reglas ni fusionar este PR antes de resolver los bloqueadores siguientes.**

Base analizada: `914fbe5`, identificada por el solicitante como producción en
`centro-operativo-cpsl.web.app`. Reporte recibido: usuarios ven información de
otras sedes/personas en sus perfiles. No hay cuenta afectada, ruta, captura ni
hora del caso concreto.

No se consultaron documentos de producción, no se repararon datos, no se
ejecutaron sincronizaciones, no se desplegó y no se fusionó. Las reproducciones
usan datos sintéticos, Chromium local y proyectos Firestore `demo-*`.

## Vías verificadas y cambios

La confianza de la tabla corresponde a la reproducción del defecto, **no** a su
atribución al incidente reportado. Las líneas corresponden a este PR; para
consultar el comportamiento anterior debe usarse `914fbe5`.

| # | Severidad | Evidencia | Defecto y corrección | Confianza |
|---|---|---|---|---|
| 1 | 🟠 HIGH | `firestore.rules:711-740`; `tests/firestore-profile-privacy.test.mjs` | Antes se podía crear un documento de usuario propio con roles/sede arbitrarios. Ahora la creación propia solo admite metadatos de login, UID exacto y correo propio; roles, alias y atribuciones son administrativos. La selección de rol persistida debe pertenecer a los roles concedidos. | 10/10 |
| 2 | 🟠 HIGH | `src/utils/authIdentity.js:8-39`; `src/context/AuthContext.jsx:235-256` | Una coincidencia por un correo importado podía seleccionar otra identidad oficial; un ID con forma de UID se prefería sin verificarlo contra Auth. Ahora se exige UID exacto o coincidencia legacy única y se rechazan puentes entre identidades oficiales y UID contradictorio. SuperAdmin se deriva del correo autenticado, no del correo encontrado. | 10/10 |
| 3 | 🟠 HIGH | `src/config/permissions.js:106-164`; `src/services/roleAgentDaemon.js:60-130` | Subcadenas de correo/nombre concedían privilegios; un directorio escribible podía aportar `rol` arbitrario. Se usan listas exactas/roles concedidos, consultas por correo exacto y no se importa `data.rol` desde managers. | 10/10 |
| 4 | 🟠 HIGH | `src/services/privacyQueries.js:6-42`; `src/utils/privacyScope.js:25-57`; `src/pages/CentroManagers.jsx:242-354`; `firestore.rules:1081-1119,1166-1186,1369-1398` | Enumeraciones globales de usuarios/managers/QT, historiales, notas, reportes y metas. Ahora se consultan y filtran por autoridad, sede, identidad o asignación; se elimina la excepción de gerentes de otras sedes como “referencia” para coordinadores locales. Se conservan autoridades globales, propia identidad y entrenadores explícitamente asignados. | 10/10 |
| 5 | 🟠 HIGH | `src/utils/sessionPrivacy.js:1-29`; `src/context/AuthContext.jsx:90-128,468-479,681-724,913`; `src/components/UserProfileModal.jsx:93-99,279-344` | Estado y cachés compartidos podían sobrevivir al cambio de cuenta/rol/perfil. Se limpian tokens, simulación y cachés legacy; las cachés restantes se particionan por identidad, y los proveedores/vistas se remontan al cambiar la identidad efectiva. El modal se remonta al cambiar de persona, limita metadatos/notas/documentos y descarta callbacks antiguos. También se rechaza un cambio de rol tardío perteneciente a otra cuenta. | 10/10 |
| 6 | 🟠 HIGH | `scripts/nodusDataScientistAgent.mjs:218-310`; `tests/nodus-reconciliation-privacy.test.mjs` | El hourly conciliaba la colección heredada `managers` por número de equipo global y permitía que el `id` embebido sustituyera al ID Firestore. Tras el primer cambio también programaba escrituras de filas sin cambio. Ahora cruza sede + equipo únicos, escribe solo cambios reales al documento leído y exige su versión anterior mediante `lastUpdateTime`. | 10/10 |

Las lecturas de `user_profiles` quedan reservadas al propietario y a
administradores de perfil autorizados. No debe confundirse un directorio
operativo visible con el derecho a leer las notas, documentos o datos de conexión
de todos sus integrantes.

En Mis KPIs se elimina la atribución por nombre, se exige correo y sede
compatibles para métricas Nodus, se limita la selección de personas al alcance
de sus KPIs y se descartan respuestas tardías de metas de otra persona. Las metas
no anuncian éxito si la escritura del servidor falla.

QT deja de descargar el CSV global en cada navegador y de recuperar una caché
global antigua ante un fallo. Consulta Firestore desde el servidor y conserva el
error explícito. **Antes de publicar este cambio debe verificarse la integridad y
actualización de `qt_directory` mediante el sincronizador autorizado existente.**

## Bloqueadores y riesgos todavía abiertos

1. **Los snapshots agregados de Nodus siguen sin una frontera por persona/sede.**
   `firestore.rules:868-871,1218-1221` conserva lecturas autenticadas generales de
   `nodus_kpis_sincronizados` y `nodus_coordinadores_c1c2`.
   `MisKPIs.jsx:184` y otras pantallas consumen documentos que reúnen personas de
   varias sedes. Un filtro React no protege el documento descargado. Hace falta
   publicar proyecciones servidor por autoridad/sede/persona, migrar todos sus
   consumidores y **después** cerrar las colecciones agregadas. Denegarlas ahora,
   sin esa migración, quitaría funcionalidad legítima. No se afirma que esto esté
   resuelto en este PR.
2. **Datos personales incluidos en recursos estáticos.**
   `src/data/usersData.js:2-4` importa el catálogo completo;
   `MisKPIs.jsx:14,135` y `CentroManagers.jsx:68,1917-1930` usan catálogos/datos
   empaquetados. El build sigue generando un chunk de `kpisEntrenadoresData`.
   Las reglas de Firestore no pueden proteger un archivo distribuido por
   Hosting. Hay que separar el catálogo mínimo de autenticación de los perfiles,
   credenciales y datos operativos; migrar estos últimos a lecturas autorizadas,
   revisar también los archivos públicos y retirar/rotar lo sensible con acceso
   administrativo. Este PR no presenta ocultar filas en pantalla como solución
   de ese problema.
3. **Otras colecciones amplias no quedan certificadas.** Por ejemplo,
   `reports` (`firestore.rules:624-640`) conserva un contrato especial para
   Llamadas y lecturas autenticadas de otros tipos. Deben inventariarse los tipos
   y sus consumidores antes de restringirlos sin romper flujos legítimos. Tampoco
   se certifican como privados todos los snapshots, documentos de calendario ni
   catálogos colaborativos por el solo hecho de pasar las pruebas de este PR.
4. **Las nuevas reglas necesitan perfiles administrativos completos.**
   La UI obtiene permisos también del catálogo estático, mientras las reglas
   consultan `users/{auth.uid}`. Algunos perfiles UID pueden contener solo
   metadatos de login. Un administrador debe verificar y provisionar roles,
   sede, `roleSedes`, alias autorizados y, para asignaciones legacy,
   `trainerDirectoryIds`/`trainerNames`; no se infieren del nombre ni de un
   directorio escribible por operadores. Antes debe auditarse si hubo perfiles
   privilegiados creados bajo las reglas antiguas. Deben revisarse asimismo las
   contradicciones entre `entrenadorId` y `entrenadorEmail`: la UI las rechaza,
   pero la autorización legacy del servidor todavía permite cualquiera de esos
   identificadores. Requiere un contrato de asignación verificado y consultas
   compatibles, no una relajación global.
5. **Una hoja publicada externamente no se vuelve privada cambiando React.**
   Retirar el fetch de QT no revoca la publicación de Google Sheets ni las
   copias descargadas anteriormente. El propietario debe revisar/revocar esa
   publicación y sustituirla por una integración servidor autenticada.
6. **No se inspeccionó el navegador afectado.** No se encontró registro de
   service worker en `src/main.jsx`/`vite.config.js`, ni persistencia IndexedDB
   de Firestore habilitada en la configuración actual. Esto no descarta un SW o
   almacenamiento de una versión histórica instalado en el navegador real.
   Las preferencias personales no sincronizadas se conservan en claves
   separadas, no se borran masivamente; las cachés no son una barrera contra
   alguien con acceso manual al almacenamiento del mismo perfil del navegador.

**Consecuencia:** no es seguro declarar “toda vía corregida” ni “incidente
cerrado”. Los puntos anteriores necesitan continuidad y acceso autorizado. El
PR está listo para revisión de código, no para desplegar a producción.

## PRs y sincronizaciones del día

Se revisaron las diferencias respecto al primer padre de los merges, no solo el
resumen del commit.

- [#181](https://github.com/crearpodersinlimitesperu-cmd/SO-AR/pull/181),
  `73d20df`: endurece inactivos y elimina antiguas concesiones por correo; no
  introduce las enumeraciones globales ni las subcadenas de autorización
  encontradas.
- [#182](https://github.com/crearpodersinlimitesperu-cmd/SO-AR/pull/182),
  `914fbe5`: monto pagado y recuperación de CSS; no se encontró ampliación de
  visibilidad en ese diff.
- [Run 41877602377](https://github.com/crearpodersinlimitesperu-cmd/SO-AR/actions/runs/41877602377):
  `workflow_dispatch`, `2026-11-04T17:26:41Z`, SHA `914fbe5`, éxito. Los logs
  distinguen **714** actualizados por el sincronizador raíz y **707** por
  `syncKpisLlamadas`; cero creados y siete avisos de ambigüedad omitida sin
  escritura. Por sí solos, ni los contadores ni los avisos prueban corrupción.
- `sync_managers_llamados.mjs:190-253` y
  `scripts/syncKpisLlamadas.mjs:450-502` cruzan nombre normalizado + sede +
  equipo y reconocen `_sheetIdentity`; omiten ambigüedades. Pueden escribir
  etiquetas, equipo, sede, entrenador/coordinador y estado en
  `managers_directory`; los payloads revisados no escriben correo o UID de
  usuario. `persistManagerSheetRow` aplica las protecciones manuales existentes.
- `scripts/syncLimaAliadosStaff.mjs` escribe metas y directorios/linaje de Lima,
  no la identidad de `users` ni la de `managers_directory`.
- `scripts/identityReconciliationAgent.mjs:28-56` genera propuestas/reportes; no
  aplica fusiones de identidad. `scripts/nodusIdentityAgent.mjs:96-156` modifica
  etiquetas/estado de verificación del snapshot Nodus, no perfiles Auth/users.
- La vía adicional reproducida del hourly pertenece a
  `NodusDataScientistAgent.reconcileManagers`, llamada por
  `nodusMultiAgentSync.mjs:1447`, y afecta a **`managers`**, no a
  `managers_directory` ni a `users`. No se encontró consumo directo de esa
  colección heredada en las pantallas revisadas. No se atribuye el incidente a
  esa vía sin evidencia adicional.

## Verificación reproducible

No existe script `test:auth`. Se ejecutaron los archivos de autenticación
directamente. No se usó `npm run build`.

| Comando / grupo | Resultado |
|---|---|
| `npm run test:privacy` | 35 pasan: políticas, identidad, sesiones, carreras, bajas y conciliación sintética |
| `firebase emulators:exec --project demo-profile-privacy --only firestore 'npm run test:privacy:rules'` | 25 pasan: nuevas reglas, A01 adaptado al contrato restringido, persistencia, llamadas atómicas y trainer coherence |
| Suite conjunta de reglas de perfil/A01/llamadas/tareas | 48 pasan y 1 fallo C-01 reproducido también con las reglas originales |
| `node --test tests/auth-startup-critical-path.test.mjs` | 6 pasan en ejecución aislada; una ejecución bajo carga paralela excedió el umbral temporal del propio baseline |
| `npm test` | 245 pasan / 248; tres fallos preexistentes |
| `npm run test:managers` | 33 pasan, 1 fallo preexistente, 2 pruebas de emulador omitidas en este comando; estas últimas sí pasan al ejecutar el emulador |
| `npm run test:persistence` | 24 pasan / 26; dos fallos preexistentes |
| `npm run test:calendars` | 34 pasan |
| `npm exec vite build` | Pasa; advertencias de tamaño de chunks |
| Oxlint sobre archivos modificados / `git diff --check` | Sin errores de lint; se mantienen advertencias existentes. Diff sin errores de espacios |

Fallos preexistentes separados: `managersHelpContent.test.js`, dos de
`cartas-sedes`, dos de `mjCalendarVisibility`, y
`managerSyncPolicy.test.js:75`. Adicionalmente se reprodujo
`firestore-task-privacy.test.mjs:561` (C-01, cuenta fuera de la whitelist
actual) con el archivo original de reglas de `914fbe5`. No se ampliaron
privilegios para hacer pasar esa prueba.

El navegador usa el **AuthProvider real** con proveedores externos simulados:
crea estado privado en A, cambia rol/sede, cambia a B en el mismo navegador,
resuelve tardíamente una escritura de rol de A y entra/sale de una simulación.
El estado anterior, token y cachés legacy no aparecen en B. No inicia sesión en
Google real ni consulta Firebase de producción.

La nueva tarea CI de privacidad se ejecuta independientemente de las suites con
fallos de baseline y solo usa emuladores. Los workflows de despliegue siguen
limitados a `master`/ejecución manual. **Fusionar cambios de reglas en master
activaría su despliegue automático existente**; no fusionar antes del gate.
Las alertas visuales sobre bordes/animaciones preexistentes no se interpretaron
como defectos del aislamiento; no se hizo un rediseño ni se silenciaron reglas.

## Auditoría y reparación de datos: procedimiento, no ejecutado

No se conocen documentos corruptos confirmados. No sería correcto inventar IDs,
campos afectados ni adjudicarlos al sync solo por coincidir temporalmente.

1. Obtener la cuenta/UID autenticada afectada, ruta/pestaña, hora y zona horaria,
   identidad/sede mostrada indebidamente y si hubo cambio de cuenta, rol o
   simulación. No solicitar contraseñas ni tokens.
2. Con acceso administrativo **solo lectura**, exportar los documentos
   estrictamente relacionados de `users`, `staff_directory`, `qt_directory`,
   `managers_directory`, `managers` y los snapshots correspondientes. Registrar
   ruta exacta, `updateTime`, origen y hash del respaldo en almacenamiento
   restringido; no subir datos personales a un issue o log público.
3. Contrastar el UID/email con Firebase Auth y la fuente administrativa
   autorizada. Revisar `email`, `emails`, `corporateEmail`, `personalEmail`,
   `uid`, `sede`, `roleSedes`, roles, `entrenadorId`, `entrenadorEmail`,
   `entrenador`, `coordinador`, equipo, `_sheetIdentity`, marcadores de cambios
   manuales y timestamps. Un nombre compartido o un número de equipo repetido
   no demuestra equivalencia.
4. Para la vía hourly reproducida, buscar equipos con el mismo número entre
   sedes y contrastar el `coordinador` en `managers/{documentoReal}`, su ID
   embebido, `nodusSyncAt`, `nodusVerified` y
   `nodus_managers_reconciliados/latest` con los datos del run y el respaldo.
   Solo esos documentos confirmados formarían el manifiesto de reparación.
5. Preparar un manifiesto restringido con cada ruta exacta, valor anterior,
   valor confirmado esperado, fuente que lo acredita y `updateTime` observado.
   Mantener todos los cargos/sedes/alias legítimos y la información operacional.
   Resolver manualmente contradicciones; no fusionar por nombre ni borrar
   documentos duplicados.
6. Tras aprobación explícita, coordinar una ventana sin escritores concurrentes
   y usar una transacción/precondición de versión. Abortar ante cualquier
   diferencia con el respaldo; modificar únicamente los campos aprobados, añadir
   auditoría inmutable y conservar respaldo/rollback. Esta reparación no está
   autorizada ni ejecutada por este informe.
7. Probar primero el manifiesto contra una copia aislada/emulador; comprobar A
   no ve B y X no recibe Y, además de autoridades globales, sedes duales y
   entrenadores itinerantes. Después de una reparación autorizada, verificar
   lectura real por las identidades involucradas y que el siguiente sync no
   revierta la corrección.

El caso real solo puede confirmarse relacionando esa evidencia con la ruta
reportada. Una reproducción sintética de una vulnerabilidad no sustituye ese
vínculo.
