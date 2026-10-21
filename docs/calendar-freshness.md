# Actualidad del calendario

## Evidencia y alcance

Reporte disponible: el calendario de Causa no parece actualizado al comprar vuelos;
captura descrita como agenda filtrada por Guayaquil, sin fechas legibles. No se
accedió al chat privado ni a una cuenta real. No es posible identificar qué
fecha esperaba la persona ni afirmar que un fallo concreto explica ese caso.

Inspección desde `85fe65308de5337bd38eff191745823fd13440fb`:

| Superficie | Ruta y fuentes | Fallo verificable |
| --- | --- | --- |
| Eventos de inicio | `src/App.jsx` carga `src/pages/Home.jsx`; recibe eventos de `CyclesProvider` y aplica proyecciones y filtros de rol, sede, equipo y fecha | La lectura solo se repetía al cambiar `currentUser`; caché sin metadatos visibles; Sheet sin límite de espera; un CSV inválido descartaba también una respuesta válida de Apps Script |
| Calendario Global | Los accesos de Home abren `public/calendario_global.html`, fuera del proveedor React | Arranque y polling dependían de Apps Script antes de consultar la hoja; sin límite de espera; actualización manual mostraba éxito aunque el método interno hubiera capturado un error |
| Contraste del Global | Google Visualization de la misma hoja | Usaba un parser distinto del CSV del proveedor; celdas de equipos con tipos mixtos podían perder su valor en Visualization |
| Agenda del equipo | `/calendario-equipo`, `src/pages/TeamCalendar.jsx` | Consume el proveedor; no es el único calendario de la aplicación |
| Calendario MJ | `/calendario-mj`, `src/pages/CalendarioMJ.jsx` y `mjCalendarSource` | Superficie distinta; no se alteran sus calendarios ni fórmulas |

La lectura HTTP de la exportación pública CSV intentada el 21 de octubre de 2026
(UTC) devolvió **403** desde este entorno. No se compararon fechas reales ni se
demostró que esa respuesta afecte al navegador de la persona. Tampoco se verificó
la versión que está desplegada.

## Reparación

`public/officialCalendarSource.js` centraliza únicamente lecturas de Apps Script
y del CSV oficial. Ambas se ejecutan en paralelo, con `cache: no-store` y un límite
de ocho segundos que incluye la descarga del cuerpo. Errores HTTP, esquema,
respuesta vacía y parseo se aíslan por fuente. Una fuente válida sigue disponible
si la otra falla; si ninguna responde, se conserva lo disponible y se muestra el
error, sin éxito aparente.

El parser CSV antes situado en `src/services/officialCalendarSheet.js` pasa a
`public/officialCalendarSheet.js`, reexportado desde la ruta anterior. Así el
Global no depende de inferencias de tipo de Visualization.

El proveedor React mantiene la clave `causa_official_calendar_cache`, acepta los
arrays antiguos sin inventar su fecha de lectura y guarda ahora `{ events,
checkedAt }`. La copia se muestra inmediatamente como no verificada. Añade
actualización manual, al recuperar foco/visibilidad/conexión y cada cinco minutos
si la página está visible. Las solicitudes concurrentes se unifican y se
cancelan al desmontar. El Global conserva su polling de treinta segundos, sin
crear intervalos duplicados, y usa la misma lectura en arranque y actualización.

La fecha mostrada es la **hora de consulta**, no la fecha de edición de Sheets ni
una garantía de vigencia de cada evento. El estado de lectura del calendario no
certifica que las proyecciones Firestore estén actualizadas; el Global mantiene
su indicador separado del Asignador. Las pantallas React no añaden una garantía
de confirmación de asignaciones.

No se cambian los permisos ni los filtros. Las proyecciones públicas siguen
siendo autoridad para asignaciones y fechas operativas. La reconciliación
conserva la semántica anterior: no elimina fechas históricas de Apps Script al
añadir filas de la hoja, ni intenta deducir cancelaciones/reprogramaciones por
proximidad. Cuando falta Apps Script, se conserva el historial de la lectura
anterior disponible durante esa sesión (y la caché React). Una discrepancia de
fechas entre fuentes requiere confirmación operativa, no una fecha inventada.

## Reproducción y regresiones

Ejecutar `npm run test:calendars`. Las pruebas no acceden a datos productivos:
los navegadores interceptan las fuentes externas y usan eventos/asignaciones
sintéticos.

- Caché antigua sin fecha, migración al formato nuevo, JSON corrupto y
  recuperación de una copia tras recargar sin conexión.
- API caída con CSV válido; CSV inválido/403 con API válida; fallo total,
  respuesta vacía, timeout de petición y de cuerpo incluso si se ignora abort.
- Lectura fresca que sustituye la copia; actualización explícita, solicitudes
  concurrentes y recuperación al volver a estar online.
- Proveedor React real bajo StrictMode, asignaciones y cambios operativos
  recibidos mediante snapshots simulados.
- Página Global real: carga desde CSV aunque Apps Script falle; equipos mixtos,
  filtro Guayaquil/búsqueda/historial, conservación de filtros tras refrescar y
  ausencia de notificación de éxito en fallo total.
- Regresiones existentes de identidad, equipos paralelos, fechas operativas,
  desasignación, calendario diario y proyección pública en build.

No se ejecutan sincronizadores, envíos de correo, escrituras Sheets, deploy ni
merge. Ninguna fecha de este diagnóstico autoriza la compra de vuelos.
