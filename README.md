# React + Vite

## Monitor de itinerarios de vuelos

`/monitor-vuelos` conserva los permisos existentes y consulta los itinerarios
PDF sincronizados desde Drive siete veces al día. No hay proveedor de estado
en vivo configurado: `SCHEDULED` significa **Programado según itinerario**,
no confirmado ni a tiempo; retrasos y horarios reales/estimados son `null`.
El panel normaliza también los archivos antiguos que decían `ON_TIME`.
Seguimiento real requiere una integración/contrato y credenciales autorizadas.

La última sincronización es la fecha del archivo, no la hora de consulta.
**Próximos / En horario estimado** incluye salidas futuras y el intervalo
salida–llegada programado, sin afirmar que el avión está en el aire.
Al llegar al horario de llegada se clasifica como pasado; si falta una llegada
válida, una salida ya pasada tampoco se considera activa. Fechas desconocidas
se consultan en **Todos**. El contador distingue próximos de horario estimado.
No se presumen vuelos terminados ni aterrizajes.

La carga usa `no-store`, sin respaldo personal hardcodeado, con error accesible
y reintento. Las asignaciones de Firestore cargan independientemente con aviso
de degradación. La actualización automática es opcional, cada cinco minutos
y solo con permiso de monitor y el panel visible. Las cartas usan el mismo
criterio de horarios y señalan que el radar es una fuente externa.
Pruebas sin datos personales: `npm run test:flight-monitor`.

## Espacio personal por uso

El agente local observa solo entradas a módulos del catálogo que realmente
se muestran tras autorizar la ruta. Guarda ID de módulo, visitas, puntuación
y fecha en `causa:module-usage:v1:<UID>` en el navegador; nunca guarda URLs,
consultas, personas ni tareas. No usa IA externa ni Firestore y no modifica
permisos. Cada navegador aprende por separado.

Los hábitos requieren al menos dos visitas y una puntuación reciente de 1,5.
La puntuación pierde la mitad de su peso cada 14 días. Con cuatro módulos
habituales aparecen **Tus accesos rápidos** (hasta seis); antes solo se sugiere
**Sueles ir a X** si existe un hábito real. El menú existente **Más Módulos y
Herramientas** destaca los frecuentes al principio, sin crear un sidebar.
Catálogo y autorizaciones de las rutas vuelven a filtrar las recomendaciones
al cambiar de rol; los módulos externos y personalizados no se aprenden.

Sin historial se conserva la presentación anterior. **Restablecer mi espacio**
borra únicamente este historial de módulos; no toca el aprendizaje específico
del panel Elizabeth. Los errores de almacenamiento se muestran con una alerta
y permiten restablecer el historial corrupto.

En simulación no se lee, registra ni restablece el uso de ninguna cuenta:
se muestra navegación por defecto y un aviso en la barra del simulador.
No se alteran las escrituras existentes de otros módulos. Las pruebas de
aislamiento, decaimiento, permisos, simulación y almacenamiento corren en
`npm test`.

## Cola de correo

`scripts/mailerDaemon.js --one-shot` procesa documentos de `mail` sin estado
o con `delivery.state: PENDING`. Cada documento se reserva en una transacción
como `SENDING` antes de enviarlo, para que ejecuciones solapadas no lo envíen
dos veces. El resultado queda en `SUCCESS`, `ERROR` o `REJECTED`.

Las alertas `task_overdue_assigner_alert` y `task_completed_alert` de más de
48 horas se marcan `SKIPPED_STALE`, con motivo, sin enviar. `createdAt` admite
ISO string y Timestamp de Firestore. Los demás tipos no caducan; sin una fecha
válida no se presume antigüedad. El lote registra conteos agregados y confirma
el estado persistido de los comunicados enviados, sin registrar destinatarios.
Los errores de procesamiento hacen fallar el modo one-shot.
La ejecución manual de `mail-dispatch.yml` admite `communication_id` para
verificar por lectura que los correos de ese comunicado quedaron en `SUCCESS`;
si no existen o tienen otro estado, el job falla.

No se reintentan automáticamente documentos en `SENDING` ni estados terminales.
Si un proceso se interrumpe después de reservar un correo, hay que comprobar
primero si se entregó antes de cambiar su estado: SMTP y Firestore no comparten
una transacción. Las pruebas de selección y reserva se ejecutan con `npm test`.

## Ayuda del Centro de Managers

La guía rápida se adapta a la vista de entrenador, CMJ/coordinación, dirección
o consulta usando los permisos existentes. Puedes plegarla y volver a abrirla;
solo esta preferencia visual se recuerda en `localStorage` por vista.

Enfoca un campo o botón con el teclado, o pasa el cursor, para consultar su
explicación. En móvil, activa **Aprender botones**: al tocar un botón aparece
su ayuda sin ejecutar su acción. **Cerrar**, **Cancelar** y **Aceptar reporte**
siguen funcionando; los campos continúan editables. Usa **Volver a trabajar**
antes de guardar. La misma opción está disponible dentro de los formularios.
`Escape` cierra la explicación.

Los textos y ejemplos están centralizados en `src/data/managersHelpContent.js`;
los controles reutilizables y la guía están en `src/components/ManagersHelp.jsx`.
La ayuda no modifica permisos, validaciones ni reglas de Firestore. No solicita
documentos de identidad: recomienda transcribir el nombre oficial, no subirlos.
El test de contenido y cobertura se ejecuta con `npm test`.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## Panel sencillo de Elizabeth

Elizabeth entra a `/elizabeth-dashboard` desde `/home`, incluso al simular su
perfil o usar Vista Consolidada. El enlace **Abrir Causa OS completo** conserva
el Home anterior en `/home-completo`; desde allí puede regresar con **Mi panel
sencillo**. La vista utiliza solo las tareas autorizadas por `ChecklistContext`.

Hosting no almacena las rutas del SPA; solo los archivos compilados con nombre
versionado bajo `/assets/` usan caché inmutable. No se registra un service worker.

El selector y la vista de reportes de un perfil directivo se conservan en la
simulación. **Terminar Simulación** restaura la cuenta administradora original
y regresa a `/home`, también después de simular más de un perfil.

El panel separa tareas **asignadas por ti** de **Tus propias tareas** (asignadas a
tu correo). La identidad de quien asignó usa `createdBy`/`assignedByEmail` y
variantes históricas de correo; `assignedByName` solo sirve como respaldo por
nombre completo exacto si no hay correo de asignador, sobre datos ya autorizados.
No se emparejan personas por apellido ni nombre parcial.

Simular un perfil no cambia la identidad de Firebase. Si la sesión del
administrador difiere del perfil mostrado, el panel indica **Vista simulada:
tareas privadas no visibles**, muestra solo datos autorizados y no afirma totales
cero. Durante la carga o ante un error tampoco se presentan totales ni se afirma
que no hay tareas. Las reglas de privacidad siguen intactas.

El panel aprende solo de acciones explícitas: abrir secciones, abrir las tareas
de una persona y cambiar el filtro. Las preferencias se guardan en `localStorage`,
con una clave por UID, únicamente en ese navegador. Las secciones y personas más
revisadas se ordenan primero; las sugerencias requieren revisiones repetidas y
usan solo tareas reales por vencer hoy o mañana. **Restablecer mis preferencias**
borra ese historial local. En simulación no se leen ni se escriben preferencias.
No se utiliza IA externa ni se añaden permisos a Firestore.
# Reportes de llamadas desde Nodus

Reportes selecciona el FDS vigente (o el próximo FDS publicado) de la sede y
etapa autorizadas en el calendario oficial. Si hay equipos paralelos, exige
selección explícita. El historial es referencia, nunca precarga de Nuevos o
Rezagados. Los 14 conteos se revisan y pueden editarse antes de enviar; la
simulación no guarda reportes, metas, revisiones ni configuración, ni envía Chat.

La sincronización publica `nodus_report_sources/{sede}_{stage}`, sin nombres,
teléfonos ni correos, con reglas por sede y C1/C2. Para la publicación inicial,
usar el workflow **Nodus report sources and read-only evidence**, modo `publish`;
modo `audit` realiza únicamente lecturas de producción y muestra evidencia
agregada. `node scripts/publishNodusReportSources.mjs` también es de solo lectura
por defecto; `--apply` publica únicamente estas fuentes derivadas.

Se bloquea la precarga si el snapshot supera 24 horas, falta el equipo o Nodus
no declara la cohorte Nuevos/Rezagados o contiene estados no reconocidos. La
extracción legacy de `/reporte` no incluye una cohorte explícita: esos registros
se muestran como **no clasificables**, no como cero ni como datos verificados.
No se infiere Rezagados a partir de asistencia, del número de equipo o de otro
reporte. Hasta contar con esa clasificación de Nodus, los conteos requieren
revisión y carga manual, identificada como `manual-reviewed`.

Se mantiene la revisión diaria existente a las 12:00 y el envío al webhook de
Chat configurado por sede. No se activa correo programado: `mail-dispatch`
procesa la cola cada cinco minutos pero no declara destinatarios ni frecuencia
de reportes de llamadas. Tampoco se vuelven a sumar los OK a metas: son snapshots,
no incrementos, y hacerlo en cada envío duplicaba participantes.
