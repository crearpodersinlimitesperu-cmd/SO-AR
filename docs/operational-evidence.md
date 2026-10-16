# Uso, feedback, tareas y evidencia operativa

Diagnóstico del código basado en `732430c` (#167), 17 de octubre de 2026.
No certifica el estado completo de producción. Esta unidad no despliega,
no modifica roles ni datos reales y no incorpora el parche FI de #166.

## Fuentes y límites del diagnóstico

| Requisito | Fuente accesible | Hallazgo y límite |
| --- | --- | --- |
| Lo más usado por usuarios | `src/utils/moduleUsage.js`, `ModuleUsageContext`, `ModuleQuickAccess` | Preferencias en `localStorage` por UID y navegador. Puntaje con vida media de 14 días; no es telemetría global ni permite ordenar lo más usado por toda la organización. |
| Feedback | `HelpModal` escribe `sugerencias_soporte`; `SuggestionsView` en SuperAdminPanel lee los 100 envíos más recientes | Superficie autorizada existente. Error de lectura ahora visible, con reintento y límite de cobertura. Un estado «Resuelto» es declarado, no certificación de corrección técnica. No se revisaron contenidos reales: la comprobación local de lectura falló por ausencia de credenciales ADC. |
| Chat | `AICopilot`, `users/{uid}/copilot_chats` | Historial privado por cuenta, distinto al buzón. No se amplían permisos, extraen conversaciones ni presenta el buzón como cobertura de chats privados. |
| Fer y Paul | `USERS_TO_IMPORT`, `permissions`, `nodusKpiDirectory`, `MisKPIs` | Identidades oficiales `fer.aragon@crearpsl.net` (CEO) y `paul.sosa@crearpsl.net` (CCO). Antes CEO se etiquetaba como gerencia de sede y CCO se omitía del directorio KPI. Ambos tienen ahora categoría ejecutiva, sin heredar metas genéricas ni atribuirse cifras de coordinadores. |
| Seis últimos equipos por sede | Calendario oficial de `CyclesContext`; `nodus_coordinadores_c1c2/latest.equiposReporte` | Selección por primera fecha C1 de cada sede + equipo explícito, excluyendo futuros en la fecha local de la sede y equipo especial 1000. Orden descendente por fecha, desempate estable por identidad; nunca por IDs globales ni números consecutivos supuestos. |

No existe en las fuentes inspeccionadas una definición aprobada de KPI personal,
fórmula, meta o período para CEO/CCO. La interfaz lo declara **no verificable**:
la revisión institucional compartida no mide su desempeño individual. En
Mis KPIs no se ofrecen formularios ni metas genéricas para esas identidades.
Los reportes manuales históricos se conservan; no pasan a ser métricas
automáticamente verificadas.

### Calidad de publicación observada

El [run 38976108380](https://github.com/crearpodersinlimitesperu-cmd/SO-AR/actions/runs/38976108380)
del 16 de octubre terminó verde, pero sus logs registran:

- `equiposReporte`: 2.148.881 bytes, sustituido por resumen por tamaño.
- FI: `partial`, 3.499 de 3.505 registros declarados.
- Rechazo de publicación FI: documento de 1.439.900 bytes frente al límite de
  1.048.576 bytes.

Por tanto, verde no prueba cobertura completa ni publicación FI reparada.
El extractor actual consulta equipos activos; no acredita el histórico de seis
equipos por sede. La nueva revisión muestra los equipos fechados accesibles y
su cobertura real C1/C2; no fabrica equipos, fechas ni resultados para completar
36 casillas.

## Lectura de la revisión

En **Auditoría de KPIs → Revisar últimos 6 equipos por sede** y **Mis KPIs →
Dirección CEO / CCO**, cada sede muestra el período entre los inicios C1
seleccionados, cuántos de seis equipos constan en el calendario y cuántos tienen
ambos reportes C1/C2 legibles. No se afirma que esos seis sean todo el histórico
de Nodus si la fuente accesible está incompleta.
`CyclesContext` combina Apps Script y la hoja oficial sin filtrar fechas pasadas,
con proyecciones públicas de asignación/operación y caché local como respaldo.
La selección descarta futuros, pero no acredita retención histórica completa ni
frescura del calendario en caché; si solo quedan futuros, muestra 0/6, no los
presenta como los últimos equipos históricos.

Los conteos requieren snapshot fechado de menos de dos horas (política existente
`snapshotFreshness`), una coincidencia única sede/equipo/etapa y registros
clasificables por cohorte/estado mediante `countNodusTeam`. Un resumen,
extracción incompleta, duplicado, fecha inválida, dato antiguo o faltante produce
**Sin dato**, no cero. Un cero solo se muestra para un reporte explícitamente
completo y vacío o un estado realmente contado con cero apariciones.
«Confirmados de llamada» no equivale a asistentes sentados. La fecha de
publicación del snapshot no certifica la fecha de cada gestión. No se suman
etapas ni se inventan tasas, metas o períodos.

## Ubicación declarada y recordatorios

Las tareas aceptan `location`, texto opcional de hasta 300 caracteres: sala,
sede o dirección introducida por quien asigna. Es independiente de
`assignedSede`, que sigue describiendo asignación y permisos. No hay GPS,
geolocalización, sede inferida de destinatarios ni enlaces de mapas automáticos.
Tareas antiguas sin campo muestran **Ubicación no declarada**.

Creación, edición (incluido borrado), detalle, notificaciones internas y correos
conservan ese texto. Las invitaciones de calendario de asignación/actualización
incluyen `LOCATION`. Los recordatorios internos se envían explícitamente desde
el detalle con **Recordar en plataforma**, sin programar avisos nuevos ni enviar
correo por sorpresa. El correo continúa siendo una acción separada autorizada.

Notificaciones incluyen ID, ubicación y enlace `/home?taskId=...`; el clic
notifica/abre la tarea y el enlace directo abre el detalle después del login.
La lectura usa la colección canónica `tasks` y el filtro de identidad existente,
sin buscar otra tarea por un título parecido cuando existe un ID exacto.
Errores de lectura/guardado son visibles; no se cambian reglas ni roles.

## Verificación y pendientes de producción

`npm run test:operational` ejecuta modelos y navegador con registros sintéticos,
incluyendo el `ChecklistProvider` real con transporte Firestore simulado.
Comprueba creación, edición, lectura, ubicación en notificaciones/correo,
enlace con aislamiento de identidad, rechazo de escritura y cobertura ausente.
`test:rules` añade lectura/edición/borrado de ubicación en Emulator y rechazo
de lectura y escritura para identidades ajenas. Las reglas existentes consideran
propietarios operativos a los destinatarios asignados (`isOwner`), por lo que
pueden editar la ubicación, además del creador/asignador. Esta PR conserva ese
contrato y lo comprueba con lectura posterior; no restringe sus flujos de
edición/evidencias. CI ejecuta ambas capas.
Estas comprobaciones no escriben en producción.

Pendientes que esta PR **no cierra**: ranking agregado real; revisión del
contenido del feedback sin acceso autorizado; cierre de cada incidencia real;
definición personal aprobada de KPIs de Fer/Paul; extracción histórica completa
de seis equipos por sede; publicación FI; entrega efectiva de correo,
despliegue y verificación autenticada en producción.
