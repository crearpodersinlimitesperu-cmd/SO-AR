# Misión IMO: centro de control autenticado

## Alcance confirmado por José (5 octubre 2026)

- Precargar fecha C1 desde calendario oficial al elegir sede/equipo, incorporando cambios de Causa.
- Entrada con documento + código al contacto registrado. Nunca basta elegir un nombre.
- Consultar solo enrolados vinculados al IMO autenticado, mediante identificadores estables de Nodus.
- Separar estado oficial Nodus, confirmación reportada por IMO y solicitud pendiente.
- Cambiar de equipo mediante solicitud al C1/C2 asignado. No modificar Nodus automáticamente.
- Notificar al coordinador asignado y registrar antes/después, actor verificado, origen y fecha.
- Confirmar aplicación oficial solamente tras una nueva sincronización de Nodus que verifique el cambio.

## Evidencia de integración

La ficha `/participantessede/perfil/{id}` de Nodus muestra identificación, correo, equipo actual, coordinador y la identificación del invitador. La tabla general separa equipo de origen, equipo actual, IMO, equipo IMO, asistencia C1 y asistencia C2. Estos son conceptos distintos.

La sesión de usuario en Nodus se confirmó mediante navegación autorizada. No se extrajeron cookies ni se copiaron credenciales del navegador. La lectura HTTP de login sin sesión recibió 403; no se intentó evadir esa respuesta. El repositorio ya tiene una sincronización horaria con credenciales NODUS_USER/NODUS_PASSWORD en GitHub Secrets. Hay que ampliar y verificar su salida privada antes de abrirla a IMOs.

## Publicado

Precarga de fechas oficiales con manejo de ausencia/ambigüedad de fechas, cambios operativos Causa, pruebas por sede/equipo; búsqueda y filtros de confirmaciones propias.

## Implementado y probado, aún sin conectar

`functions-imo/controlModel.mjs`: contrato de solicitud, verificación de dueño de enrolado, proyección mínima sin documentos/contactos privados, resolución por coordinador asignado y conciliación posterior con Nodus. No existen rutas activas ni escrituras de producción para este contrato todavía.

## Trabajo pendiente antes de activar

1. Verificar extracción privada de IDs de participante/IMO, documento IMO, contacto de verificación y coordinador por el sincronizador autorizado. No resolver identidades por parecido de nombres.
2. Implementar y probar puerta de entrada en servidor: límites por IP/documento, código aleatorio, expiración, límite de intentos, uso único, sesión corta con acceso solo a sus enrolados y revocación.
3. Comprobar entrega del código. La cola actual de correos se procesa por GitHub Actions cada cinco minutos y puede retrasarse; no prometer entrega instantánea. Evaluar canal apropiado antes de habilitar.
4. Implementar transacción de solicitud + auditoría + notificación idempotente; bandeja C1/C2 con revisión protegida.
5. Adaptar portal a sesiones verificadas y fuente Nodus privada, búsqueda/filtros de estados oficiales y novedades; cerrar las lecturas públicas de perfiles en las reglas como parte del mismo lanzamiento.
6. Probar extremos: homónimos, documentos con ceros iniciales, datos faltantes, cambios de coordinador, solicitudes duplicadas, reenvíos de OTP, intentos concurrentes, caída de Nodus, nueva fecha C1 y estados Nodus desactualizados.
7. Publicar servidor/frontend/reglas en orden que no exponga datos; verificar con una cuenta de prueba autorizada antes de habilitar el acceso real.

No anunciar documento + código, estados oficiales privados ni notificaciones automáticas como activos mientras esos pasos estén pendientes.

## Infraestructura verificada el 6 de octubre de 2026

- La sesión correcta de Firebase muestra el proyecto `centro-operativo-cpsl` en **Blaze**. Los comentarios de agosto sobre Spark no describen el estado actual.
- GitHub Actions tiene permisos de crear/actualizar Cloud Functions, Cloud Build, habilitar servicios y actuar como la cuenta de ejecución predeterminada. Auditoría de solo lectura: run `37470940428`.
- Las cuatro funciones existentes reportan `CloudRunServiceNotFound`; dos figuran FAILED y dos UNKNOWN. No se han modificado ni eliminado durante esta revisión. No asumir que una entrada en la consola equivale a un backend operativo.
- El backend IMO se prepara en `functions-imo/`, separado del Copiloto. No requiere Cloudflare.
- `authModel.mjs` implementa primitivas de códigos de un uso (10 minutos, 5 intentos), claves HMAC por documento/país emisor y sesiones revocables (30 minutos). El país emisor del documento no es la nacionalidad ni debe inferirse de la sede. Los cambios de desafío, límites y sesión deberán persistirse transaccionalmente para evitar concurrencia.
- 16 pruebas locales pasan. Estas primitivas no son todavía endpoints desplegados ni una integración de correo operativa.
- La auditoría devuelve 0 campañas v2 y 0 registros en `imo_identities_private` y `imo_enrollees_private`. El snapshot de coordinación existe con 15 coordinadores, pero los nombres de las misiones antiguas no acreditan la identidad de un IMO.
- Queda pendiente la extracción y validación de identidad/contacto/relación estable desde Nodus, los endpoints Firebase, la entrega real del código y el despliegue conjunto del portal y las reglas.

## Implementación Firebase del acceso (6 octubre, pendiente de activación)

- `firebase.imo.json` despliega únicamente el codebase `imo` para no reemplazar las funciones de otros módulos.
- `functions-imo/index.mjs`: callable `imoAccess` (código, validación, consulta propia, calendario, solicitudes, salida) y trigger `imoDeliverCode` (correo privado).
- El acceso exige `imo_system/control.enabled`, un snapshot de Nodus de menos de 24 horas y campaña schemaVersion 3 con IDs autorizados. Sin estos datos rechaza el acceso.
- Desafíos, sesiones, entregas cifradas, límites y snapshots usan colecciones `imo_private_*`, sin permisos de lectura/escritura desde ningún cliente web. La prueba de reglas confirmó denegación incluso para gerencia.
- Solicitud, evento inmutable y notificación para el correo del coordinador se crean en una transacción idempotente. Una solicitud NO escribe el equipo en Nodus.
- 20 pruebas unitarias y 7 pruebas con emulador verifican límites concurrentes, un solo uso, aislamiento de enrolados/sedes, revocación, rechazo de fuentes viejas, cifrado de entrega y notificación única.
- La prueba de reglas requiere Java con `-Duser.language=en -Duser.country=US`; el emulador 1.22 falla al compilar mensajes con locale `es_CO`.
- El acceso automático de Nodus con las credenciales de CI no confirmó sesión en los runs 37474990222 y 37475349856. No se importaron registros ni se probaron contraseñas alternativas. Se solicitó actualizar los secretos existentes al usuario.
- La sincronización horaria anterior daba éxito tras fallo de arranque de Chrome por ausencia de X server. Se corrigió la salida de error para que preservar datos antiguos no se reporte como sincronización exitosa. El arranque y las credenciales de ese proceso aún requieren reparación/verificación.
- Pendiente: importador real verificado, campañas v3, revisión autenticada por C1/C2 y portal con código. El frontend actual sigue siendo v2; no anunciar autenticación ni avisos activos hasta completar la conexión y prueba integral.

### Resultado del despliegue aislado

Run `37511911253`: creación/configuración de los secretos IMO correcta y carga del código correcta. Despliegue detenido antes de crear las funciones porque la cuenta de CI no tiene `secretmanager.secrets.setIamPolicy`.

Permiso mínimo preparado para aprobación: rol `roles/secretmanager.secretAccessor` de la cuenta de ejecución `122588918051-compute@developer.gserviceaccount.com` exclusivamente en `IMO_VERIFICATION_SECRET`, `IMO_MAIL_USER`, `IMO_MAIL_PASS`. No hace falta conceder administración general de secretos a GitHub. Se solicitó autorización explícita para este acceso; aún pendiente. La consola de Google Cloud solicita reautenticación del usuario antes de abrir Secret Manager.

No se ha activado `imo_system/control`, no se enviaron códigos reales y no se importaron identidades. Reanudar desde la verificación de identidad de Google y los secretos NODUS_USER/NODUS_PASSWORD. No repetir la creación de secretos ni sustituir sus valores al reintentar.

### Avance de permisos y recuperación (6 de octubre, tarde)

- Secret Accessor confirmado en consola: cuenta de ejecución, 3 de 3 secretos IMO.
- Run `37546616866`: las dos compilaciones fallaron; Google identificó ausencia de `roles/logging.logWriter`.
- El usuario autorizó continuar y Google confirmó la concesión de Logs Writer.
- Run `37549241719`: el recurso fallido de `imoDeliverCode` no tenía eventTrigger; Firebase interpretó el stub como HTTPS e impidió actualizarlo a trigger.
- Se añadió recuperación acotada: solo elimina/recrea `imoDeliverCode` cuando es FAILED, sin eventTrigger, con codebase `imo` y entryPoint exacto. Nunca elimina una función operativa.
- Run `37549555841`: recuperación correcta; compilación falló leyendo el archivo fuente. Los registros ya funcionan y muestran denegación de `storage.objects.get` en `gcf-v2-sources-122588918051-us-central1`.
- Se dejó preparado, sin guardar, `roles/storage.objectViewer` para `122588918051-compute@developer.gserviceaccount.com` exclusivamente en ese bucket. Pendiente de autorización del usuario para este nuevo acceso.
- No hay funciones IMO operativas confirmadas. No se habilitó el control ni se enviaron códigos reales. La autenticación/sincronización Nodus y el portal v3 siguen pendientes.

## Plazo del portal verificado

Al completar la primera verificación OTP, el backend crea una sola ventana en `imo_private_mission_windows/{campaignId}/profiles/{imoHash}` con `openedAt` de hora del servidor. Una verificación posterior no reinicia el plazo. El backend permite reportes hasta el instante exacto de las 8.5 horas y rechaza nuevas solicitudes después; los reportes anteriores siguen visibles. La ventana se entrega con la respuesta privada del roster y el portal muestra el contador de 7 horas, la prórroga automática de 90 minutos y el modo de solo lectura.

El Monitor puede leer las fechas/nombre de esas ventanas para personal autorizado; ningún cliente puede escribirlas y los perfiles privados completos siguen fuera del navegador. Este límite del portal es adicional al estado de operación v3: no habilita el snapshot, no crea campañas, no acredita una integración activa de Nodus ni sustituye la revisión C1/C2.

### Backend desplegado y verificado — 7 de octubre de 2026

- Confirmados permisos de secretos, Logs Writer, Storage Object Viewer (solo bucket de fuentes) y Artifact Registry Writer (solo gcf-artifacts).
- El usuario autorizó solicitudes públicas solo para `imoAccess`. Se aplicó en Cloud Run; `imoDeliverCode` mantiene su trigger privado.
- Run `37684978829`: SUCCESS. Ambas funciones ACTIVE; trigger Firestore de entrega comprobado y endpoint público devuelve INVALID_ARGUMENT (400) a una acción inválida.
- Consulta sin sesión/datos de prueba a `roster`: FAILED_PRECONDITION, verificación de Nodus no disponible; no reveló enrolados, no se enviaron códigos.
- La advertencia de retención de imágenes se conserva. El wrapper solo acepta ese error específico tras éxito de ambas operaciones y verificación independiente de estado/trigger/endpoint. No se modificaron políticas de borrado.
- Los metadatos de NODUS_USER y NODUS_PASSWORD siguen fechados 1 de octubre; no se repitieron intentos de login con las mismas credenciales que fallaron.
- Pendiente funcional: acceso válido a Nodus, importador verificado, campañas/portal v3, revisión de coordinadores y prueba integral. Backend activo no equivale a portal terminado.

## Portal conectado al backend — 8 octubre 2026

- Se añadió `VerifiedMissionPortal` para campañas schemaVersion 3: documento, código, sesión en memoria de 30 minutos, consulta propia, calendario, búsqueda, filtros y solicitudes idempotentes de cambio/contacto/asistencia.
- No se leen perfiles públicos en campañas v3. Los enlaces v2 existentes mantienen su flujo explícitamente no verificado; no fueron convertidos ni activados con identidades inferidas.
- Monitor: eliminados los textos fijos 133/291 y la afirmación no calculada de cero duplicados/omisiones. Buscar ya no amplía silenciosamente el filtro de equipo.
- Validación: 23 pruebas de contratos existentes; recorrido de navegador con respuestas sintéticas locales (documento, código, consulta, ausencia de datos, cambio 30→32 pendiente y cierre de sesión); compilación de producción.
- Pendientes reales: acceso válido al sincronizador Nodus, importación privada verificada, habilitación de campaña v3, bandeja autenticada de revisión C1/C2 y prueba integral de correo/notificación con datos autorizados. No se habilitó el control ni se enviaron mensajes durante esta comprobación.

## Disponibilidad para C1 — regla del usuario, 8 octubre

Solo se muestran enrolados con inasistencia C1 explícita o deserción C1 registrada. Una deserción C1 tiene precedencia sobre asistencia de apertura. Ya sentados sin deserción se excluyen; estado ausente, intención IMO, pagos, llamadas y estado C2 no acreditan disponibilidad. Misma regla en Monitor, candidatos, generación, portal v2/v3 y servidor (consulta y solicitudes). No se borran fichas ni historial. Las campañas antiguas que no guardaron estado C1 quedan pendientes de verificación, no se reclasifican como disponibles. Las proyecciones nuevas conservan la evidencia C1. Pruebas de modelo/candidatos/identidad/control: 22 aprobadas; compilación aprobada. Prueba adicional de emulador añadida; no ejecutada localmente por ausencia de Java.
