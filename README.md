# React + Vite

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
