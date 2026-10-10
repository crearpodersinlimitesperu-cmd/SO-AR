# Coherencia Managers / Llamadas / CMJ

## Fuentes y criterio

| Superficie | Fuente actual | Significado |
| --- | --- | --- |
| CentroManagers | `managers_directory` + catálogo `INITIAL_MANAGERS` | Coach de acompañamiento del manager/equipo. El diagnóstico consulta solo Firestore, sin merge ni fallback. |
| KPIsEntrenadoresLlamadas | `kpis_entrenadores_llamadas` publicado por `syncKpisLlamadas.mjs` + JSON precargado | Reportes de llamadas y pagos importados de Sheets. Los IDs `mgr_N`/`llam_N` son filas, **no identidades personales**. |
| AsignadorEntrenadores | `asignaciones_entrenadores` por evento/FDS, calendario de CyclesContext | Entrenador de salón. Cada FDS puede tener un entrenador distinto. Nuevas confirmaciones privadas conservan email explícito; proyección pública solo etiqueta. |
| CMJDashboard / CMJDiagnosticsDashboard | `cmjDataService`, reportes Drive/SEGUIMIENTO_EQUIPOS + overlay NODUS | Coordinador regional, métricas de equipos y entrenadores históricos por FDS. No equivale al coach de llamadas. |
| CalendarioMJ | `mj_calendars` | Agenda de equipos, no fuente de identidad de entrenadores. |
| trainerService | Feedback/briefing de salón (incluye mocks preexistentes) | No provee asignaciones de Managers ni CMJ. |
| venuesData | Sedes/hoteles de eventos | Geografía, no directorio de personas. |

Fuente de verdad seleccionada para **identidad y etiqueta**: documentos actuales de `users`, identificados por ID de documento o email explícito y único. Para **acompañamiento**: `managers_directory`. Para **salón**: `asignaciones_entrenadores`. No se pretende reemplazar estas fuentes distintas con una lista única.

Un ID desconocido/contradictorio no cae a nombre/email. Un email duplicado es ambiguo. Homónimos no se cruzan. Una sede residencial del entrenador no impide viajar; para comparar asignaciones vinculadas se exige el mismo documento del manager y sede/equipo. Registros sin IDs son cobertura pendiente, no errores confirmados.

## Detección y reparación

Managers → **Coherencia**, solo administradores explícitos no simulados. Lectura actual de Firestore sin fallback a catálogos. Muestra conteos de identidades ausentes, ambiguas, inactivas, etiquetas distintas, managers activos sin asignación y registros de llamadas sin vínculo explícito. El auditor read-only también cuantifica la cobertura del histórico CMJ, sin tratarlo como acompañamiento.

Solo es reparable una etiqueta de manager activo respaldada por `entrenadorId` existente y usuario no inactivo. Requiere vista previa y confirmación; transacción relee manager y usuario, rechaza cambios concurrentes y escribe etiqueta + `trainer_coherence_log` atómicamente. Bitácora inmutable con permisos Firestore de SuperAdmin. No modifica IDs, roles, equipos, pagos, historial ni asignaciones cruzadas.

Los sincronizadores preservan campos de coach cuando ya hay identidad explícita, distinguen sede/equipo y omiten coincidencias ambiguas. Selectores legacy de Managers rechazan cambios de nombre que dejarían un ID confirmado obsoleto. La vista KPI no obtiene teléfonos de homónimos por nombre.

## Evidencia y límite semántico

Evidencia de código: `syncKpisLlamadas.mjs` previamente emparejaba Managers solo por nombre+sede, sobrescribía coach en cada ejecución y enriquecía llamadas solo por nombre. `sync_managers_llamados.mjs` usaba nombre+equipo sin sede. Asignador guardaba nombre sin identidad; CMJ conserva etiquetas históricas. Estos riesgos son observables en el código, no conteos de errores en producción.

Ejecutar **Trainer coherence** por workflow_dispatch con `audit=true` en runner autorizado. `scripts/auditTrainerCoherence.mjs` solo llama `.get()` y registra conteos, nunca nombres, emails, teléfonos, IDs ni documentos completos. No importa sincronizadores con efectos secundarios. Cero escrituras. Los resultados distinguen problemas inequívocos de ausencia de información.

Lectura real autorizada del 10/10/2026 15:59 UTC: [run 38065728108](https://github.com/crearpodersinlimitesperu-cmd/SO-AR/actions/runs/38065728108). Consultados 889 managers, 206 usuarios, 934 registros de llamadas, 44 slots privados y 115 equipos CMJ históricos. Detectadas 1.092 referencias de entrenador sin identidad explícita y 1.049 registros llamadas/CMJ sin vínculo explícito al manager. Las categorías se solapan; no se suman como personas ni errores. **Cero discrepancias de identidad verificables con información suficiente, cero etiquetas reparables, cero escrituras**. Esto no demuestra igualdad entre fuentes: demuestra falta de trazabilidad suficiente. No se asignaron IDs por nombres para rellenar ese vacío.

Decisión pendiente del dueño: **¿el coach de acompañamiento debe coincidir con el entrenador de cada FDS, o son responsabilidades independientes?** Hasta resolverla no se comparan como roles iguales ni se repara esa diferencia.

Auditorías previas relacionadas: utilidades/tests de trainerAssignments y teamGrouping; agentes de pólizas e identidades; reportes NODUS y protección de historia de managers. No había test específico de coherencia entre estas fuentes. Los nuevos tests cubren IDs, homónimos, sede/equipo, inactivos, ausencia de asignación, discrepancias vinculadas y separación de FDS.
