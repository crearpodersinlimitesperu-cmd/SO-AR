# React + Vite

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
