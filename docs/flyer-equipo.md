# Flyer por sede y equipo

El generador abre en **Por sede y equipo: C1, C2 y MJ**. Seleccionar primero
la sede y después un equipo del calendario. El listado y la preview muestran
exclusivamente esa sede e identidad; cambiar sede borra la selección de equipo.
Se incluyen fechas históricas y futuras, sin elegir automáticamente el equipo
más cercano a hoy.

MJ significa **Maestría del Juego**. Un evento genérico de MJ no se convierte
en Creación, Relación ni Gratitud. Esas fases solo aparecen cuando el evento
las declara explícitamente. Sin vínculo de equipo se muestra
`Fechas no disponibles · sin vínculo explícito`.

La descarga usa PNG 1080x1920; más de seis entradas se distribuyen en páginas
para no omitir fechas. La preview permite elegir la página. El modo separado
**Por fase: una sede o todas (editor manual)** conserva las cinco fases,
los presets manuales y la exportación por sede/todas. Esos presets y la
duración histórica inferida de C1 no alimentan el modo por equipo.

## Contrato y evidencia de fuente

`CyclesContext.jsx` obtiene eventos del Apps Script `getEventos`, contrasta
la hoja oficial mediante Google Visualization, y aplica las excepciones de
calendario existentes. La hoja declara fecha de inicio (columna 0), sede (1),
equipo (2) y nombre de entrenamiento (3), pero no fecha final.
Los eventos del Apps Script declaran `equipo`, `sede`, `nombre`,
`fecha_inicio` y `fecha_fin`; `id` es del evento, no del equipo.

El filtro une únicamente sede normalizada no ambigua e identidad explícita:
`32`, `Equipo 32`, `EQ. #32` y `E32` representan E32, nunca E132.
La lista `32*132` declara ambos equipos explícitamente; `343536` no se
divide en 34/35/36. Un sufijo explícito de equipo en el nombre sirve de
respaldo; números sueltos o nombres parciales no sirven.
Las variantes `team`, `equipoNombre` y `equipoId` están cubiertas por fixtures.
Un `equipoId` opaco se compara exactamente y no se supone equivalente a
un número. Declaraciones numéricas contradictorias se excluyen.

No se reutiliza `buildCycleForEquipo` de CyclesContext: actualmente emplea
substrings y, si falta MJ, proximidad temporal. Tampoco se consultan
`mj_calendars`/CMJ ni las fechas derivadas de `CalendarioMJ.jsx`: esa pantalla
calcula FDS posteriores a partir del primero y no constituye evidencia de
fechas explícitas en `events`. No se modifican permisos, reglas ni escritores.

## Auditoría read-only, 10 de octubre de 2026

Se consultaron ambos endpoints públicos desde Node, procesando solo
campos/fases/conteos y fechas de Lima E32; no se imprimieron entrenadores,
direcciones, personas ni datos de viaje.

| Fuente | Eventos totales | C1 con equipo | C2 con equipo | MJ con equipo | MJ sin equipo |
|---|---:|---:|---:|---:|---:|
| Apps Script | 1856 | 212 | 210 | 210 | 0 |
| Hoja oficial | 1028 | 86 | 84 | 0 | 84 |

Ninguna fuente expuso eventos explícitos de Creación/Relación/Gratitud
reconocidos por el clasificador. El Apps Script no expuso `equipoNombre`
ni `equipoId`; esos campos son compatibilidad probada con fixtures, no
evidencia de producción.

Para **Lima E32**, ambas fuentes expusieron C1 el **23 de octubre de 2026**
y C2 el **5 de noviembre de 2026**. El Apps Script declaró finales
**25 de octubre** y **7 de noviembre**, respectivamente. Ninguna de las dos
fuentes declaró un MJ asociado exactamente a Lima E32. No se asigna el MJ
de otro equipo ni el MJ sin equipo de la hoja.

Esta lectura no acredita asignaciones privadas de Firestore ni excepciones
que solo se carguen en una sesión autenticada; el generador sigue consumiendo
los `events` autorizados por CyclesContext. La ausencia de vínculo no afirma
que MJ no exista en la operación, sino que no se puede atribuir con estos datos.

## Cobertura

`npm run test:flyer-teams` cubre clasificación C1/C2/MJ y FDS explícitos,
variantes de campos/nombres, E32/E132, sedes paralelas, ausencia,
contradicciones, fechas históricas, no inferencia de duración y paginación
sin pérdida. CI ejecuta esta suite además de las regresiones existentes.
Los fixtures contienen las tres fases y las subfases MJ; los datos leídos
solo acreditan C1/C2 para Lima E32.
