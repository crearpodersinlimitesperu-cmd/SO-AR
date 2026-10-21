# Flyer por sede y equipo

El generador abre en **Por sede y equipo: C1, C2 y MJ**. Seleccionar primero
la sede y después un equipo del calendario. El listado y la preview muestran
exclusivamente esa sede e identidad; cambiar sede borra la selección de equipo.
Se incluyen fechas históricas y futuras, sin elegir automáticamente el equipo
más cercano a hoy.

MJ significa **Maestría del Juego**. Por regla explícita del dueño del
10/10/2026, **MJ N → Creación N, Relación N−1, Gratitud N−2**, usando la
misma fecha del MJ asociado exactamente a sede/equipo. MJ3 produce 3/2/1,
MJ4 produce 4/3/2 y MJ5 produce 5/4/3. Para MJ1/MJ2, las fases cuyo número
sería cero o negativo indican `Sin fase derivable para MJ N`, sin fecha.
No se calculan fechas desplazadas.

El número debe estar explícito en el encabezado `MJ3`, `MJ 3`,
`MJ 3,2,1` (terna descendente válida), `MAESTRIA DEL JUEGO 3`, o en
`mjNumero`/`numeroMJ`/`mjNumber`. Campos o encabezados contradictorios
impiden derivarlo. **`equipo` no es un número MJ**; el ID de evento
tampoco. Un MJ genérico conserva su fecha e indica
`sin número MJ explícito; sin fases derivables`. Se conservan las
subfases etiquetadas explícitamente en los eventos. Sin vínculo de equipo se muestra
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

Una segunda lectura read-only, posterior a la nueva regla, confirmó que
los 210 MJ del Apps Script y los 84 MJ de la hoja se llaman exclusivamente
`MAESTRIA DEL JUEGO`. No exponen `mjNumero`, `numeroMJ` ni `mjNumber`;
el Apps Script solo tiene `equipo` numérico y la hoja lo deja vacío.
Por tanto, **no hay número MJ explícito verificable para derivar fases
en esas fuentes actuales**. El soporte de números MJ y ternas está probado
con fixtures; no se atribuye a los datos productivos.

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

La guía contextual **Indicaciones de uso**, abierta por defecto y plegable
con teclado, explica en ambas vistas la selección, preview y descarga.
Para habilitar el vínculo MJ, el responsable confirma sede/equipo exactos,
fechas y número MJ explícito en la fuente; el administrador verifica que
la integración entregue ese campo o nombre admitido a los eventos de Causa OS.
Agregar una columna no consumida no habilita el vínculo. No se modifican
la fuente ni su esquema desde la guía.

`npm run test:flyer-teams` cubre clasificación C1/C2/MJ y FDS explícitos,
variantes de campos/nombres, E32/E132, sedes paralelas, ausencia,
contradicciones, fechas históricas, no inferencia de duración, MJ3/4/5,
bordes MJ1/2, ausencia/conflicto de número MJ y paginación
sin pérdida. CI ejecuta esta suite además de las regresiones existentes.
Los fixtures contienen las tres fases y las subfases MJ; los datos leídos
solo acreditan C1/C2 para Lima E32.
