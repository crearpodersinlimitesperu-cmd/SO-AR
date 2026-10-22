# Cierre y entrega de tareas

**Fecha de registro:** 2026-10-22
**Responsable del cambio:** equipo de ingeniería/Copilot
**Estado:** implementación propuesta para revisión; validación CI pendiente. No se desplegó ni fusionó este cambio.

## Diagnóstico y evidencia

La revisión se hizo sobre el `master` más reciente disponible en el worktree (`85fe653`), que ya contiene la PR #174. #174 corrige el rollback de actualizaciones rechazadas y exige ciclo válido para escribir tareas de catálogo. No cubre el guardado ordinario del modal ni la entrega de correo.

La causa residual estaba en `src/components/TaskDetailModal.jsx` (`handleSaveAll`): el guardado de evidencia, notas o avance podía enviar `completed:false`, `status:'Pendiente'` y `completedAt:null` calculados a partir del progreso. Además, `ChecklistContext.editCustomTask` podía sustituir `assigneeProgress` por una plantilla con asignaciones en cero al editar y notificar por correo/in-app aunque la tarea estuviera cerrada. La ruta del botón explícito de alternancia es distinta; ahora su intención de reapertura se pasa por separado.

`mailerDaemon.js` procesaba los mensajes pendientes con un claim de estado, pero sin contador persistente ni lease; el escaneo vencido solo miraba `completed/status` globales, creaba documentos de correo con IDs aleatorios y actualizaba `lastReminderAt` fuera de una transacción. Tampoco se releía la tarea antes de llamar SMTP. `task_completed_alert` se generaba en el contexto de tareas al completar una tarea.

## Cambios implementados

- El guardado normal ya no interpreta progreso parcial como intención de reabrir. La transacción relee el estado persistido, conserva el cierre y su fecha, y solo cambia el estado terminal si recibe intención explícita.
- Los guardados obsoletos y la edición de asignaciones releen la tarea dentro de una transacción; los campos de cierre no se aceptan desde el editor de asignaciones, y el progreso de una persona ya cerrada se conserva mientras siga asignada. La edición de tarea cerrada no crea correo ni notificación.
- Las actualizaciones de catálogo con ciclo escriben el mapa de completitud del ciclo/sede objetivo sin sobrescribir `completed`, `status`, `completedAt` o progreso globales. La reapertura de un ciclo no altera otros ciclos ni el cierre global.
- Las transiciones manuales de cierre y reapertura producen registros inmutables en `task_completion_events`. Las reglas permiten el registro únicamente junto con una transición coincidente y actor autorizado; no se amplió la regla general de actualización de tareas.
- Se retiró la generación automática de la alerta de tarea completada. Los correos históricos de tipo `task_completed_alert` se descartan como `SKIPPED_CLOSED`, `SKIPPED_UNLINKED_TASK`, `SKIPPED_STALE` o `SKIPPED_POLICY`; no se entrega una alerta automática aunque la tarea se haya reabierto.
- Mensajes y recordatorios manuales consultan la tarea dentro de la transacción que encola el correo/notificación. Los correos de tarea nuevos llevan `taskId`; mensajes antiguos que no puedan vincularse de forma segura a una tarea se descartan cuando su tipo identifica que pertenecen a una tarea.
- El flujo programado `assignInsuranceTaskAndMail.mjs` ya no envía SMTP directamente: preserva los campos de ciclo de vida existentes, comprueba el cierre en la transacción que crea notificación/outbox y usa IDs deterministas. El mailer común vuelve a comprobar el cierre antes de SMTP.
- El mailer reclama y relee la tarea asociada en una transacción antes del envío. Una tarea cerrada se marca terminalmente `SKIPPED_CLOSED` con hora, alcance observado y motivo. La comparación usa ciclo/sede o destinatario cuando el documento registra ese ámbito; no se toma la finalización de otro ciclo como cierre de este.
- Si una tarea tiene completitudes por ciclo pero el correo no identifica ciclo/sede, no se infiere un cierre global ni se envía a ciegas: se conserva en estado terminal `SKIPPED_SCOPE_UNKNOWN` para revisión.
- Los recordatorios vencidos usan IDs deterministas derivados de tarea, tipo, destinatario normalizado y bucket de debounce. La revisión de cierre, creación de documentos de correo y actualización de `lastReminderAt` ocurren en una sola transacción; no se avanza el debounce si no se encola ningún documento nuevo.
- La cola persiste `attemptCount`, horas de inicio/final, lease y próximo intento. El límite es tres intentos por documento, con espera exponencial de 5/10 minutos. Una concesión vencida pasa a `DELIVERY_UNKNOWN`, no se reenvía automáticamente.
- Un rechazo SMTP explícito o un error de conexión/resolución considerado previo a aceptación queda como `ERROR` y puede reintentarse dentro del límite. Si SMTP acepta el mensaje pero Firestore no confirma `SUCCESS`, el documento permanece `SENDING` y, al vencer el lease de 10 minutos, pasa a `DELIVERY_UNKNOWN`. Los errores SMTP cuya aceptación no se puede determinar también quedan en `DELIVERY_UNKNOWN`.

## Límite de entrega y observabilidad

SMTP y Firestore no comparten una transacción. Sin soporte de idempotencia del proveedor, no es posible garantizar exactamente una entrega. `DELIVERY_UNKNOWN` requiere conciliación manual y evita un reintento automático ciego; no demuestra si el proveedor entregó el correo.

Correo con varios destinatarios sin `recipientEmail`: la relectura pre-SMTP evalúa cada destinatario; se omiten los participantes cerrados (se registra solo `delivery.suppressedClosedRecipients`, un contador) y se envía a los abiertos; si todos están cerrados queda `SKIPPED_CLOSED`.

Límite de participantes: la regla de Firestore verifica como máximo diez participantes modificados por escritura (`lifecycleMutation.assigneeKeys`, 1000 expresiones por evaluación). El modal solo envía las entradas que el usuario cambió respecto de la línea base normalizada, por lo que la normalización legacy no cuenta; una única edición de más de diez participantes distintos se rechaza (no hay fragmentación automática) sin relajar la protección terminal.

Control de volumen y alerta interna: antes de reclamar un correo vinculado a tarea, el mailer consume transaccionalmente presupuestos diarios UTC (`mail_delivery_budgets`): 30 intentos por tarea, 20 por destinatario y 6 por par tarea+destinatario. Al agotarse, el documento pasa a `SKIPPED_RATE_LIMIT` (terminal, sin SMTP) y se crea una sola notificación interna `MAIL_DELIVERY_ANOMALY` por administrador (`SUPER_ADMIN_EMAILS`, id determinista), sin contenido de tarea ni correos en el texto. Los umbrales son decisiones de ingeniería de este cambio, no valores aprobados por negocio; no hay canal externo (correo/Slack). Los reintentos por documento siguen limitados a 3.

Auditoría de cierre: cada evento `completed` guarda `closureContext` (comentarios, `evidenceUrl` y lista `evidences` vigentes al cerrar, con límites de tamaño); las reglas exigen que coincida con la tarea resultante, y el evento es inmutable. La aplicación no tiene campos de comentario/evidencia específicos del cierre: se registra el estado vigente en ese momento, no se distingue cuál se añadió "para cerrar". Los cierres anteriores a este cambio no tienen ese snapshot.

Reapertura (backend): las reglas de `tasks` rechazan cualquier update que cambie un cierre raíz, de ciclo/sede o de participante a abierto salvo que `lifecycleMutation` referencie un `task_completion_events` nuevo, `reopened`, del mismo actor y alcance, con `occurredAt == request.time`. Ediciones ordinarias (notas, evidencia, progreso de abiertos) siguen permitidas. Limitación: el evento valida actor y alcance, no la autorización adicional más allá de las reglas existentes de `tasks`.

Los correos de tarea antiguos sin `taskId` ni `calendarEvent.taskId` no permiten identificar su tarea; si conservan un tipo conocido de correo de tarea, se descartan. Un correo legado sin tipo y sin vínculo de tarea no puede clasificarse con seguridad por el daemon actual. La consulta o modificación de datos reales no se realizó.

## Criterios de aceptación

| # | Criterio | Estado | Evidencia esperada |
|---|---|---|---|
| 1 | Guardar evidencia/notas/progreso o editar asignaciones no reabre una tarea cerrada ni reabre asignatarios cerrados; conserva las fechas existentes tras recarga. | Implementado; ejecución CI pendiente | `tests/task-lifecycle-browser.test.mjs`, `writeTaskDoc` y `editCustomTask` transaccionales |
| 2 | Un cierre/reapertura por sede y ciclo no cambia el estado global ni otro ciclo. | Implementado; ejecución CI pendiente | `src/utils/taskLifecycle.test.js`, fixture browser con estado global y dos ciclos |
| 3 | La reapertura exige acción explícita y una escritura autorizada. | Implementado; Emulator CI pendiente | Intención explícita del modal/contexto; permiso completo de rol/propietario y pruebas de privacidad |
| 4 | Cierre/reapertura queda trazado en registro append-only con actor, hora y alcance; modificaciones/borrados del evento se deniegan. | Implementado; Emulator CI pendiente | `task_completion_events`, `tests/firestore-task-privacy.test.mjs` |
| 5 | No se genera ni entrega la alerta automática `task_completed_alert`. | Implementado; pruebas locales pendientes | Productor retirado; política de cola y casos `SKIPPED_*` en `tests/mail-queue.test.mjs` |
| 6 | Correo/notificación task-bound se suprime si el alcance correspondiente ya está cerrado al encolar, reclamar o antes de SMTP, incluso en productores programados. | Implementado; integración SMTP no ejecutada | `editCustomTask`, `sendTaskMessage`, `sendTaskReminderEmail`, `claimPendingMail`, `skipTaskMailIfClosed`, outbox programado y pruebas mock/browser |
| 7 | Recordatorios vencidos son idempotentes y actualizan debounce atómicamente solo al encolar. | Implementado; pruebas locales pendientes | `enqueueOverdueTaskMails`, IDs deterministas y test concurrente |
| 8 | Intentos quedan contados por documento y nunca exceden tres. | Implementado; pruebas locales pendientes | Claim transaccional, `recordMailFailure`, pruebas de retry cap |
| 9 | El lease evita claims simultáneos; SMTP/confirmación ambiguos no se reenvían automáticamente. | Implementado; pruebas SMTP integradas pendientes | `DELIVERY_UNKNOWN`, prueba de lease vencido y respuesta ambigua |
| 10 | Un ciclo cerrado no bloquea otro ciclo, correo no task-bound queda fuera del filtro de cierre, y una identidad ajena no modifica/ve tareas privadas. | Implementado en fixtures/emulador; CI del head final pendiente | Pruebas de ciclos, `operational_broadcast`, cambio de identidad simulado y reglas; sin acceso a producción |

## Plan de validación

El workflow existente `.github/workflows/validate-task-privacy.yml` ya se activa por estos archivos y ejecuta:

1. `node --check scripts/mailQueue.js && node --check scripts/mailerDaemon.js && node --check scripts/assignInsuranceTaskAndMail.mjs`.
2. `npm run test:persistence` y `npm test` (incluye `tests/mail-queue.test.mjs`).
3. `npm run build`.
4. `npx --yes firebase-tools@latest emulators:exec --only firestore --project demo-task-privacy "npm run test:rules && node --test tests/firestore-manager-persistence.test.mjs scripts/tests/nodus-report-rules.test.mjs"`.

**Plan por nivel:** funcional/regresión: `npm run test:persistence` + `npm test`; integración aislada: Firestore Emulator con `npm run test:rules` y mocks de outbox/SMTP; compatibilidad/build: `npm run build`; concurrencia/carga: aumentar la contención de varios workers sobre el mismo doc y bucket de recordatorio únicamente con Firestore Emulator/mocks, esperando un solo claim/registro, sin SMTP. No se definió un SLA cuantitativo de carga, por lo que no se inventa un umbral.

Localmente (Node 22 y Firestore Emulator con Temurin 21) pasaron `taskLifecycle`, `mail-queue` y `tests/firestore-task-privacy.test.mjs`; las pruebas de navegador (Puppeteer) no produjeron resultado local y dependen de CI, igual que el build. La prueba de cambio de identidad es un fixture de navegador; no equivale a un login real/multidispositivo ni demuestra sincronización en producción. No se hizo prueba de carga SMTP ni se envió correo.

## Registro de cambios

- 2026-10-22 — equipo de ingeniería/Copilot: protección de cierre frente a guardados ordinarios/obsoletos; aislamiento del estado por ciclo; registro append-only de transiciones; supresión de alertas automáticas de cierre; control de cierre para correo task-bound; outbox determinista para vencidos; contador de intentos, lease, límite y estado ambiguo; regresiones de navegador, reglas y cola.
- 2026-10-22 — equipo de ingeniería/Copilot: el productor programado de seguros deja SMTP directo y reusa outbox idempotente; preserva estado terminal y comprueba cierre antes de crear notificación/correo; añade prueba de relectura pre-SMTP y chequeo de sintaxis CI para los scripts.
