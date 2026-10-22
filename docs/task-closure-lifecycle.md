# Cierre y entrega de tareas

**Fecha de registro:** 2026-10-22
**Responsable del cambio:** equipo de ingeniería/Copilot
**Estado:** BLOQUEADA por integridad de cierres de participantes no registrados en el ledger. CI verde no equivale a cumplimiento integral. No fusionar ni desplegar.

## Diagnóstico y evidencia

La investigación comenzó sobre `85fe653`, que ya contiene la PR #174; el último `origin/master` consultado por git fue `18fc645` (2026-10-22). #174 corrige el rollback de actualizaciones rechazadas y exige ciclo válido para escribir tareas de catálogo. No cubre el guardado ordinario del modal ni la entrega de correo. No se duplicaron las PR #166, #176 ni #177.

La causa residual estaba en `src/components/TaskDetailModal.jsx` (`handleSaveAll`): el guardado de evidencia, notas o avance podía enviar `completed:false`, `status:'Pendiente'` y `completedAt:null` calculados a partir del progreso. Además, `ChecklistContext.editCustomTask` podía sustituir `assigneeProgress` por una plantilla con asignaciones en cero al editar y notificar por correo/in-app aunque la tarea estuviera cerrada. La ruta del botón explícito de alternancia es distinta; ahora su intención de reapertura se pasa por separado.

`mailerDaemon.js` procesaba los mensajes pendientes con un claim de estado, pero sin contador persistente ni lease; el escaneo vencido solo miraba `completed/status` globales, creaba documentos de correo con IDs aleatorios y actualizaba `lastReminderAt` fuera de una transacción. Tampoco se releía la tarea antes de llamar SMTP. `task_completed_alert` se generaba en el contexto de tareas al completar una tarea.

## Cambios implementados

- El guardado normal ya no interpreta progreso parcial como intención de reabrir. La transacción relee el estado persistido, conserva el cierre y su fecha, y solo cambia el estado terminal si recibe intención explícita.
- Los guardados obsoletos y la edición de asignaciones releen la tarea dentro de una transacción; los campos de cierre no se aceptan desde el editor de asignaciones, y el progreso de una persona ya cerrada se conserva mientras siga asignada. La edición de tarea cerrada no crea correo ni notificación.
- Las actualizaciones de catálogo con ciclo escriben el mapa de completitud del ciclo/sede objetivo sin sobrescribir `completed`, `status`, `completedAt` o progreso globales. La reapertura de un ciclo no altera otros ciclos ni el cierre global.
- Las transiciones manuales de cierre y reapertura producen registros inmutables en `task_completion_events`. Las reglas permiten el registro únicamente junto con una transición coincidente y actor autorizado; no se amplió la regla general de actualización de tareas.
- Si un avance individual cruza también el estado raíz, se escriben eventos distintos para cada alcance en la misma transacción: `lifecycleMutation.eventId` enlaza la raíz y `assigneeEventIds` el participante. La regla de reapertura raíz exige un evento con `scope: {}`, no basta un evento individual.
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

Vínculo de tareas en correo: el productor de seguros guarda `linkedTaskIds` (tarea individual) además de `taskId` (maestra); `claimPendingMail` y `skipTaskMailIfClosed` releen las vinculadas. Antes de SMTP se filtran los destinatarios cerrados en cualquiera de ellas; si todos están cerrados se omite el envío. Una tarea vinculada ausente o de ciclo ambiguo bloquea el documento completo. El esquema admite como máximo cinco vínculos adicionales: datos inválidos o más de cinco terminan en `SKIPPED_UNLINKED_TASK`; no se truncan ni se omiten verificaciones silenciosamente.

Participantes: la regla no limita a diez los cambios abiertos por escritura. La tarea mantiene un libro `closedAssigneeKeys` (claves cerradas), comparado con conjuntos: los guardados abiertos masivos se permiten y se probaron con 40 asignados. Solo los participantes ya cerrados que se modifican (`lifecycleMutation.assigneeKeys`) se verifican individualmente, con un máximo de 8 por escritura (rechazo explícito, nunca fragmentación silenciosa). El modal real con 14 asignados guarda una nota nueva y progreso propio sin normalizar ni alterar a los demás.

La eliminación de una clave del ledger exige que realmente cambie su entrada y que haya reapertura con evento nuevo; listar una clave intacta como "liberada" ya no permite quitar su protección. Las regresiones Emulator comprueban tanto el intento de eliminación como la reapertura posterior sin evento.

**Bloqueo principal no resuelto:** el ledger escrito por un cliente no demuestra exhaustividad. Una entrada cerrada legacy ausente del libro, o un cierre posterior de un cliente que no lo actualice, puede quedar fuera de la intersección que verifica la regla. Se reprodujo en Emulator: tarea raíz abierta con `assigneeProgress[owner].completed: true`, sin `closedAssigneeKeys`; un update que abre ese participante y envía `lifecycleMutation: { scope: {}, eventId: 'no-event-created', assigneeKeys: [] }` resulta permitido, sin evento. La reproducción aislada y su salida se conservaron como artefactos de sesión, no como una regresión que acepte ese comportamiento. Por tanto, no se declara protección backend universal.

Exigir verificar todas las claves modificadas con la estructura actual volvería a limitar también los avances abiertos de más de diez asignados, expresamente rechazado por compatibilidad. No se introdujo ese límite ni se hizo una migración productiva. Antes de aceptar esta PR debe resolverse el modelo de estado terminal por participante (por ejemplo, documentos por participante con validación individual atómica y transición compatible desde el mapa legado). No basta añadir una bandera de "ledger inicializado" de cliente ni una migración inicial que permita futuros cierres sin registrar.

Control de volumen y alerta interna: antes de reclamar un correo vinculado a tarea, el mailer consume transaccionalmente presupuestos diarios UTC (`mail_delivery_budgets`): 30 intentos por tarea, 20 por destinatario y 6 por par tarea+destinatario. Al agotarse, el documento pasa a `SKIPPED_RATE_LIMIT` (terminal, sin SMTP) y se crea una sola notificación interna `MAIL_DELIVERY_ANOMALY` por administrador (`SUPER_ADMIN_EMAILS`, id determinista), sin contenido de tarea ni correos en el texto. Los umbrales son decisiones de ingeniería de este cambio, no valores aprobados por negocio; no hay canal externo (correo/Slack). Los reintentos por documento siguen limitados a 3.

Auditoría de cierre: cada evento `completed` guarda `closureContext` (comentarios, `evidenceUrl` y lista `evidences` vigentes al cerrar, con límites de tamaño); las reglas exigen que coincida con la tarea resultante, y el evento es inmutable. La aplicación no tiene campos de comentario/evidencia específicos del cierre: se registra el estado vigente en ese momento, no se distingue cuál se añadió "para cerrar". Los cierres anteriores a este cambio no tienen ese snapshot.

Reapertura (backend): las reglas de `tasks` protegen los cierres raíz, de ciclo/sede y de participantes registrados. La transición requiere un `task_completion_events` nuevo, `reopened`, del mismo actor y alcance, con `occurredAt == request.time`. Ediciones ordinarias siguen permitidas. **Los participantes no registrados mantienen el bloqueo descrito arriba.** El evento valida actor y alcance, sin ampliar los permisos existentes de `tasks`.

Los correos de tarea antiguos sin `taskId` ni `calendarEvent.taskId` no permiten identificar su tarea; si conservan un tipo conocido de correo de tarea, se descartan. Un correo legado sin tipo y sin vínculo de tarea no puede clasificarse con seguridad por el daemon actual. La consulta o modificación de datos reales no se realizó.

## Criterios de aceptación

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Guardar evidencia/notas/progreso o editar asignaciones no reabre una tarea cerrada; conserva fechas tras recarga. | Cubierto en cliente; backend parcial | Navegador con contexto y modal reales; participante legacy omitido del ledger sigue pendiente |
| 2 | Cierre/reapertura por sede y ciclo no cambia el estado global ni otro ciclo. | Cubierto en pruebas aisladas | `taskLifecycle.test.js` y navegador con dos ciclos |
| 3 | Reapertura solo explícita, autorizada y protegida en backend. | BLOQUEADO para participantes no registrados | Reproducción Emulator descrita arriba; raíz, ciclo y ledger existente sí tienen regresiones DENIED/ALLOWED |
| 4 | Actor/hora/alcance y comentarios/evidencia append-only. | Cubierto en flujos nuevos; parcial histórico | Eventos separados raíz/participante; snapshot sobrevive edición, reapertura y recarga; no se reconstruyen cierres anteriores |
| 5 | No generar ni entregar `task_completed_alert`. | Cubierto con mocks | Productor retirado y política terminal de cola |
| 6 | Suprimir correo/notificación task-bound al encolar, reclamar y antes de SMTP. | Cubierto con mocks/navegador; sin SMTP real | Seguros maestra+individual, multi-destinatario y destinatarios reales del sender con `sendMail` simulado |
| 7 | Vencidos idempotentes y debounce atómico. | Cubierto con mocks | IDs deterministas y concurrencia de enqueue |
| 8 | Cap, registro de intentos y alerta de patrón repetido. | Cubierto con mocks; umbrales por aprobar | Tres intentos/documento; presupuestos 30/20/6 y notificación interna deduplicada |
| 9 | Lease y ambigüedad sin reenvío ciego. | Cubierto con mocks; limitación SMTP | Lease vencido/aceptación ambigua → `DELIVERY_UNKNOWN`, conciliación manual |
| 10 | Aislamiento de usuario/ciclo y compatibilidad multiasignada. | Parcial | Reglas y fixtures de identidad; 40 avances abiertos atómicos y modal real de 14; falta protección universal sin romper ese flujo |

## Plan de validación

El workflow existente `.github/workflows/validate-task-privacy.yml` ya se activa por estos archivos y ejecuta:

1. `node --check scripts/mailQueue.js && node --check scripts/mailerDaemon.js && node --check scripts/assignInsuranceTaskAndMail.mjs`.
2. `npx oxlint -c .oxlintrc.lifecycle.json src/context/ChecklistContext.jsx src/components/TaskDetailModal.jsx src/utils/taskLifecycle.js scripts/mailQueue.js scripts/mailerDaemon.js`; `npm run test:persistence`, `npm run test:operational` y `npm test` (incluye `tests/mail-queue.test.mjs`).
3. `npm run build`.
4. `npx --yes firebase-tools@latest emulators:exec --only firestore --project demo-task-privacy "npm run test:rules && node --test tests/firestore-manager-persistence.test.mjs scripts/tests/nodus-report-rules.test.mjs"`.

**Plan por nivel:** funcional/regresión: `npm run test:persistence` + `npm test`; integración aislada: Firestore Emulator con `npm run test:rules` y mocks de outbox/SMTP; compatibilidad/build: `npm run build`; concurrencia/carga: aumentar la contención de varios workers sobre el mismo doc y bucket de recordatorio únicamente con Firestore Emulator/mocks, esperando un solo claim/registro, sin SMTP. No se definió un SLA cuantitativo de carga, por lo que no se inventa un umbral.

Localmente están disponibles Node 22 y Firestore Emulator con Java 21. Pasaron `npm run test:persistence` (20), `npm run test:operational` (15, Puppeteer con modal real), las pruebas de outbox y el lint selectivo `no-undef` (advertencias preexistentes). También pasaron 35 casos en `node --test tests/firestore-task-privacy.test.mjs tests/firestore-a01-hardening.test.mjs` bajo Emulator. Las nuevas regresiones ejecutan el contexto real para cierre/reapertura raíz, ciclo e individual, y conservan el resultado real del callback de `runTransaction` en el mock.

El head publicado anterior `7eb9ff5` pasó [Validate 39822284551](https://github.com/crearpodersinlimitesperu-cmd/SO-AR/actions/runs/39822284551) y [Trainer 39822284727](https://github.com/crearpodersinlimitesperu-cmd/SO-AR/actions/runs/39822284727); esos checks no sustituyen los de commits posteriores ni cubren el bypass legacy reproducido. La prueba de cambio de identidad es un fixture; no equivale a login real/multidispositivo ni demuestra sincronización productiva. No se hizo prueba de carga SMTP ni se envió correo. `deploy.yml` incluye Hosting, reglas e índices; `deploy-rules` también se activa por reglas. No se ejecutaron esos despliegues ni `mail-dispatch` productivo.

## Registro de cambios

- 2026-10-22 — equipo de ingeniería/Copilot: protección de cierre frente a guardados ordinarios/obsoletos; aislamiento del estado por ciclo; registro append-only de transiciones; supresión de alertas automáticas de cierre; control de cierre para correo task-bound; outbox determinista para vencidos; contador de intentos, lease, límite y estado ambiguo; regresiones de navegador, reglas y cola.
- 2026-10-22 — equipo de ingeniería/Copilot: el productor programado de seguros deja SMTP directo y reusa outbox idempotente; preserva estado terminal y comprueba cierre antes de crear notificación/correo; añade prueba de relectura pre-SMTP y chequeo de sintaxis CI para los scripts.
- 2026-10-22 — equipo de ingeniería/Copilot: rechazo de eliminación de ledger sin transición auditada; eventos separados raíz/participante; rechazo de vínculos de correo inválidos o excesivos sin truncar; filtrado por destinatario en todas las tareas vinculadas; pruebas del sender real con SMTP simulado y modal real de 14 participantes. Bloqueo de integridad legacy reproducido y pendiente; no se declara reparación completa.
