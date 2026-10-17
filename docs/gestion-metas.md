# Gestión de metas: lectura del avance

La página `GoalsBoard` muestra el rol guardado en cada asignación mediante
`getRoleDisplayName`. No deduce roles por nombre, género, porcentaje ni tipo de
meta, y no cambia los perfiles. Una asignación sin rol dice «Rol no registrado».
Este rol puede ser histórico: no se afirma que sea el rol vigente del perfil.

El logro y el objetivo son valores distintos. El porcentaje de una cuota es
`logro / objetivo × 100`, redondeado: 11/6 muestra 183% y «Meta superada».
Solo la anchura de la barra se limita a 100%. Un objetivo cero o ausente no
permite calcular porcentaje. La suma de cuotas se muestra separada del objetivo
global, con aviso si difiere; no se ajustan números automáticamente.
El promedio del ciclo conserva el roll-up existente (máximo 100% por meta);
no es una suma de personas ni una prueba de asistencia.

Centinela compara fuentes disponibles, no certifica la actividad del daemon.
No utiliza snapshots empaquetados como datos actuales ni convierte objetivos
en logros. Las confirmaciones telefónicas no prueban asistencia en sala.
Un reporte de sala debe coincidir en sede, equipo y etapa; se usa el más
reciente, no el más alto. Un directorio general no prueba Creación/Relación.
Sin evidencia comparable no se ofrece sincronización ni «al día».
Consultas de directorio que alcanzan el límite tampoco acreditan un total.

Se conservan la matriz de lectura/gestión de la página, la ruta y las reglas de
Firestore. El filtro de sede existente se comparte entre caché y snapshot.
La caché se separa por identidad y se identifica como potencialmente antigua.
**Límite importante:** las reglas actuales de `goals` permiten lectura a toda
identidad autenticada; el filtrado de esta página no es una barrera de seguridad.
No existe un gate por equipo asignado en esta página: los equipos organizan las
metas y delimitan comparaciones, no permisos. Estas reglas no se endurecen ni se
declaran seguras en este cambio. Tampoco se migran registros productivos.

Regresiones sintéticas:
`node --test src/services/goalsBoard.test.js src/services/goalsTimeline.test.js`.

## Buscar el contrato en Nodus

El workflow `nodus-report-sources.yml`, modo `discover-goals`, utiliza únicamente
los secretos del runner autorizado. `discoverNodusGoalSources.mjs` abre rutas de
lectura conocidas y sigue enlaces seguros de calendario/equipos/aliados, hasta
20 rutas. Emite solo rutas, respuesta HTTP, cabeceras de tablas y conteos de filas
visibles; no publica nombres, contactos, registros ni credenciales. Los conteos
visibles **no** representan totales completos ni logros de metas. No escribe en
Nodus, Firestore o metas.

La primera consulta de 2026-10-11 (run `38155744260`) quedó bloqueada antes de inspeccionar
las fuentes: `/dashboard` respondió HTTP 403 (`landing_route_rejected`). Se
detuvo sin reintentar el inicio de sesión ni eludir controles. Ese intento no
aportó contratos de datos. Posteriormente el usuario proporcionó un acceso
autorizado y se verificaron las rutas descritas debajo desde el navegador.
No se requiere que esta cuenta tenga permiso sobre `/dashboard` para utilizar
las rutas de lectura verificadas. El contrato de calendario por etapa y
asistencia permanecía sin verificar en esa revisión; no se sustituye por cuotas
ni llamadas. La revisión posterior de `/reporte` se detalla al final.

### Contrato verificado mediante acceso autorizado en navegador (2026-10-11)

La cuenta autorizada abrió `/sedes`, `/equipos` y `/aliados` sin modificar datos.
La cabecera de aliados se reconfirmó a las `2026-10-11T16:39:32.189Z`:
hora de consulta en navegador, no ejecución en runner ni modificación de Nodus.
La denegación anterior de `/dashboard` no probaba que todas las rutas fueran
inaccesibles. No se almacenan las credenciales suministradas.

`/equipos`: tabla `#tablaEquipos`, DataTables en modo cliente (no server-side).
Columnas `EQUIPO`, `SEDE`, `INICIO`, `FIN`; enlace de lectura
`/equipos/detalle/{id}`. Para E31 Lima, id 141: 01/09/2026 a 20/09/2026.
Son fechas del registro de equipo, **no fechas C1/C2/MJ del calendario**.

`/aliados?id_equipo=141`: selector `select[name="id_equipo"]` verifica la
identidad del filtro. Cabeceras `Aliados Asignados (17)` y
`Aliados Confirmados para C2 (1)` son categorías distintas.
`Pagaron C2 / C2+MJ (40)` no se usa como aliados ni asistencia.
No se recogen nombres, teléfonos, correos ni filas de personas.
Nodus no expuso una marca de modificación de estas medidas: `sourceUpdatedAt`
queda `null`, y `queriedAt` informa solo cuándo se consultó.

`publishNodusGoalSources.mjs` genera una proyección agregada en
`nodus_coordinadores_c1c2/goal_sources`, colección ya legible por los mismos
usuarios autenticados; no cambia reglas ni metas. El workflow es **manual**:
sin `publish=true` solo audita; publicar requiere una decisión explícita.
No hay publicación programada ni login repetido tras un 401/403.
La implementación permanece en PR borrador, sin publicar esa proyección ni
desplegar la nueva UI. No hay datos nuevos productivos provenientes de este PR.

La UI presenta período/conteos Nodus con enlaces y fecha de consulta, separados
del calendario y de las cuotas/avances guardados. Una consulta de más de 24 horas
no se aplica a esta comparación, lo cual no demuestra que la fuente se haya
modificado o esté vigente. No se considera aliado asignado como logro/asistencia
ni se ofrece sincronizarlo a `currentValue`. Calendario poblado por etapa
sigue sin contrato Nodus verificado; el estado de asistencia del reporte se
verificó posteriormente (véase abajo).

### Revisión específica E32 Lima C1

Consulta autorizada de navegador el 11/10/2026 (no ejecución del runner):
`/equipos`, `#tablaEquipos`, 132 filas cliente, confirmó a las
16:49:15.185Z `EQUIPO 32`, `LIMA CICLO 1`, id 149,
`/equipos/detalle/149`, INICIO 23/10/2026 y FIN 05/11/2026.
Es el **período del registro de equipo**, no un evento C1 confirmado.
E31 Lima C1 conserva otro id, 141, y otro período; no se sustituye por E32.

En `/aliados?id_equipo=149`, a las 16:49:29.541Z,
`select[name="id_equipo"]` quedó con valor vacío y sin opción id 149.
La opción de EQUIPO 32 disponible corresponde a Guayaquil (id 96), no Lima.
No hubo cabeceras de conteos para E32 Lima: esto significa **fuente no
disponible para ese filtro**, no cero aliados. El colector rechaza ese
desajuste y no publica una consulta parcialmente exitosa.

La ruta `/cronograma` expone las columnas SEDE / CICLO, ENTRENAMIENTO,
EQUIPO, INICIO y FIN (se omiten campos personales). Su formulario GET
ofrece Lima Ciclo 1 como `id_sede=7` y Capítulo 1 como
`id_entrenamiento=1`. `/cronograma?id_sede=7&id_entrenamiento=1` confirmó
ambos filtros a las 16:49:58.453Z y devolvió «Sin registros en el cronograma».
Se verificó la ruta y el estado vacío, **no un calendario poblado ni fecha
de C1 E32**. No se integra como calendario ni asistencia.

La captura de Gestión de Metas muestra E31/E30 guardados y un error de
actualización del directorio; no demuestra ausencia de E32 en Nodus.
No se renumeran metas antiguas, asignaciones o roles con esta evidencia.
Las horas anteriores son de consulta; la modificación del origen sigue
desconocida. Se mantiene PR borrador, sin publicación ni despliegue.

### Preparar metas del siguiente equipo sin mover el histórico

La edición «Editar meta» permite título, indicador y objetivo a los roles
de gestión existentes. Revalida la sede y el documento en transacción,
rechaza cambios concurrentes de esos campos y conserva avances, reparto,
equipo y etapa. El porcentaje se recalcula con el objetivo sin recortar
sobrecumplimiento. Dirección puede gestionar todas las sedes; gerencia,
solo la propia. La vista global muestra preparación por cada sede.

En Misión IMO, el equipo del IMO no es el equipo de ingreso de sus enrolados.
La revisión de Lima E32 identificó `capitulo1`/`fecha_c1` como campos de
registro separados de `asistencia` (`pendiente`/`confirmado`). El alias
`asistio_c1` de la tabla de participantes no certifica asistencia histórica.
El importador específico Lima149 conserva la inscripción y deja desconocida
la asistencia histórica sin evidencia válida; no genera campañas ni altera
Nodus. La reconciliación recurrente tampoco convierte ese alias en asistencia.
El cruce del reporte C1 usa el ID numérico del participante contrastado con
el `data-info.id` de Nodus, nombre e IMO; el teléfono visible puede diferir
de la ficha y no sustituye esa identidad. Se espera la inicialización
DataTables antes de exigir filas completas. El generador muestra conteos
de fuentes importadas y de evidencia pendiente por separado de candidatos
históricamente elegibles.

La política explícita `registered-c1-contact` prepara misiones de **contacto**
para inscritos verificados en el detalle Nodus, con sede, equipo destino y
fecha C1 coincidentes. No habilita desconocidos sin esa inscripción ni
personas con C1 ya cursado (salvo deserción explícita, como antes).
Monitor, generador, validación al guardar y portal schema2 usan el mismo
contrato; la inscripción viaja al perfil y el historial desconocido se
etiqueta «por verificar». Las intenciones conocidas se comparan sin espacios
externos ni diferencias de mayúsculas, sin modificar el valor fuente;
estados ausentes o no reconocidos permanecen fuera del enlace con aviso.
La política histórica y el portal privado schema3
no cambian. Las confirmaciones del IMO siguen siendo contacto e intención,
no asistencia efectiva. Se conserva la revisión humana antes de crear o
compartir. Un adapter compatible con la importación scoped existente exige
ID Nodus, fuente de reconciliación, timestamp válido, sede y equipo destino
almacenados antes de proyectar la inscripción al candidato. No vuelve a
consultar Nodus ni escribe datos de origen; conserva IDs/checks/owners.
Las reglas admiten únicamente ese
tipo adicional de misión y exigen que perfiles/misiones coincidan con la
campaña; sus gates de identidad y rol permanecen iguales.

Por autorización expresa de actualización automática para todas las sedes,
el workflow de fuentes Nodus consulta y publica agregados cada seis horas
(cron UTC), además del dispatch manual. Sus scopes proceden de metas de
todas las sedes, nunca del filtro de pantalla. Solo publica fuentes
verificadas: no crea objetivos, roles, cuotas ni convierte las medidas
Nodus en avance manual. Un error de acceso/esquema cancela la publicación;
la última consulta caduca a las 24 horas y no se presenta como tiempo real.

El módulo muestra el próximo período C1 de equipo de la sede cuando existe
una consulta Nodus reciente, inequívoca y con fechas válidas. Lo identifica
como **preparación**, no como evento confirmado. Si aún no tiene un ciclo
de metas, gerencia puede abrir la configuración con ese número de equipo.
Sin proyección publicada no se ofrece una selección Nodus ficticia; la
configuración manual permite indicar el equipo expresamente.

El asistente exige sede, equipo y al menos un objetivo aprobado por gerencia.
Guarda `teamNumber` en el ciclo y en cada meta hija, con avance cero y sin
copiar asignaciones. Rechaza el ciclo duplicado conocido, objetivos negativos
o fraccionarios y creación desde datos de metas aún no confirmados por el
servidor. Conserva las etapas y controles de rol existentes; no cambia reglas.

La petición de rellenar entrenamientos pasados no autoriza convertir aliados
asignados o confirmados en asistencia, graduación, managers o apoyos. La
proyección ya muestra los períodos y las métricas raw verificadas junto al
histórico por sede/equipo/etapa, sin sobrescribir `currentValue`. Sigue
pendiente acordar la equivalencia entre el estado histórico del reporte y el
conteo inicial de sentados para sobrescribir avances, y verificar los demás
resultados para un backfill.
No se han creado metas E32 ni modificado históricos productivos: faltan los
objetivos aprobados y la revisión/publicación del PR borrador.

### Reporte histórico de asistencia verificado

Calendario de Maestría usa el calendario de eventos, no la proyección de
períodos Nodus. Su búsqueda del Primer FDS reconoce solo el equipo exacto
o su etapa Creación dentro de una cohorte, normaliza el nombre del evento
y rechaza fechas ambiguas. Sin evento inequívoco presenta un aviso dentro
del formulario; no afirma que el equipo no exista ni precarga C1 como MJ.

La lectura de la hoja oficial usa CSV, no Google Visualization: la consulta
del 11/10/2026 confirmó 2.508 filas CSV frente a 1.028 filas Visualization,
que además perdía cohortes de texto en la columna de equipo numérica.
El CSV conserva `29, 30 y 31` para Lima MJ del 09/10/2026 (Creación E31)
y `30, 31 y 32` del 13/11/2026 (Creación E32). La app carga esas filas de
la fuente, sin fechas hardcodeadas ni escrituras en la hoja. Fechas de fin
ausentes no se inventan en el calendario fuente.
La segunda hoja suministrada (`10JVeVpdyMpA25rU6CwMIyoa3-dO2EUt9`,
gid 1960233176) devolvió 401 y solicitó iniciar sesión; no se integró
su contenido ni se intentó eludir sus permisos. La inspección manual del
runner usa la cuenta `GOOGLE_SERVICE_ACCOUNT_JSON` existente con scope
Sheets de solo lectura y reporta únicamente estructura/etiquetas conocidas,
sin celdas personales ni credenciales. El JSON Apps Script del calendario
permanece como fuente principal; el CSV solo sustituye el contraste
Visualization que perdía histórico y cohortes.
Si Sheets rechaza el documento con 400, la inspección verifica primero su
MIME en Drive con la misma cuenta. Solo si es Excel (.xlsx), descarga en
memoria (máximo 10 MB) y reporta la estructura de sus primeras 20 filas,
sin títulos o celdas personales. No convierte el archivo, no cambia permisos
y no aplica un gid de Google a índices de pestañas Excel.
La primera ejecución respondió Sheets 400 y Drive 404. Después de la
confirmación de acceso compartido del usuario, la lectura Drive con
`supportsAllDrives=true` tuvo éxito: run 38181031989, consulta
11/10/2026 22:36:23.094Z. Se confirmó que el JSON configurado corresponde
a la cuenta compartida y que el documento es XLSX; se leyeron etiquetas y
estructura de 10 pestañas. No se cambiaron permisos ni se convirtió el
archivo. El gid del enlace no se interpreta como índice de pestaña Excel.
Esta verificación de acceso/estructura no afirma que se hayan contrastado
todas las fechas del archivo: el calendario publicado mantiene el JSON
oficial como fuente, con su contraste CSV.

`/reporte` ofrece un formulario GET con `select[name="id_equipo"]`.
Incluye E31 Lima id 141, E30 Lima id 134 y E32 Lima id 149; esto no significa
que el selector de Aliados tenga las mismas opciones.
`/reporte?id_equipo=141` confirmó filtro 141 a las 17:02:02.043Z del
11/10/2026. `#tblReporteC1` y `#tblReporteC2` son DataTables cliente
(`bServerSide=false`), con columna ASISTENCIA. Las celdas contienen
«Asistió» y checkbox marcado o «—» y checkbox sin marcar:

| Equipo | Reporte | Filas completas | Asistió marcado | Sin marca |
|---|---|---:|---:|---:|
| E31 Lima (141) | C1 | 180 | 119 | 61 |
| E31 Lima (141) | C2 | 40 | 30 | 10 |
| E30 Lima (134) | C1 | 159 | 89 | 70 |
| E30 Lima (134) | C2 | 49 | 29 | 20 |

E30 se consultó a las 17:03:03.827Z, con filtro 134 confirmado.
No se exportaron filas ni identificadores de personas. Son estados del
reporte al consultar; no se conoce su modificación ni son ausencias
confirmadas los registros sin marca. No se deduce calendario de esos estados.

El colector agrega únicamente esa columna para metas de Sentados C1/C2 de
equipos cuyo período registrado haya terminado, con identidad C1 del equipo
única y filtro exacto. Rechaza tablas incompletas/server-side, filtros erróneos
y estados/checkboxes contradictorios. La UI muestra `markedAttendance` y
`unmarked` separados del avance guardado. No consulta E32 futuro para
presentar ceros como resultados. No modifica metas, cuotas ni roles; se
mantiene la publicación manual desactivada por defecto y sin ejecutar.

### Diagnóstico de la extracción C1 horaria

El fallo del equipo 150 en los runs 38488371714 y 38459907384 ocurrió
esperando que `#tblReporteC1` se registrase como DataTables durante 30 segundos.
La evidencia histórica anterior (incluido E32 id 149) no demuestra el contrato
actual del equipo 150 ni la causa de ese timeout. No se cambia el ID de equipo
ni se deducen cantidades a partir de esos datos.

`scripts/nodusC1Report.mjs` centraliza la navegación C1 instrumentada para
el extractor horario y la sincronización explícita Lima149. Espera filtro
exacto e inicialización completa (`_bInitComplete`): el registro de DataTables
por sí solo puede preceder a la carga asíncrona de idioma/Ajax. Mantiene
el límite de 30 segundos, los controles de esquema, filas completas,
identidad y asistencia, y rechaza navegación HTTP fallida o ruta inesperada.
No inicializa tablas por su cuenta ni usa filas DOM como alternativa.

En caso de fallo emite `C1_REPORT_FAILED` con equipo, etapa
(`navigation`, `readiness`, `extraction`), motivo permitido, estado HTTP,
clasificación de ruta/filtro, indicadores de tabla/bibliotecas/inicialización
y contadores de errores de página, scripts y peticiones de datos. No incluye
URLs completas, contenido de errores de navegador, etiquetas de equipos,
filas, nombres, teléfonos ni credenciales. Si la página no permite inspección,
lo indica explícitamente; los listeners se eliminan al terminar cada equipo.

Verificación local: `npm run test:nodus-reports`. La extracción de todos los
equipos debe terminar antes de publicar: un fallo conserva el snapshot
anterior y su fecha, sin promoverlo como actual. Tras la revisión/integración,
el siguiente run horario autorizado debe aportar los diagnósticos o completar
la extracción y publicación; todavía hace falta esa verificación externa
para afirmar que el equipo 150 está actualizado. No se despacha extracción
ni despliegue manual, no se modifican registros Nodus y no se habilitan envíos
sin política confirmada de destinos y frecuencia.

El run 38522049498 aportó evidencia nueva: HTTP 200, ruta y filtro correctos,
tabla con 15 cabeceras, pero jQuery/DataTables ausentes, ocho fallos de scripts
y un error de página. El extractor horario no intercepta ni aborta requests.
El HTML histórico declara jQuery en `code.jquery.com` y DataTables en
`cdn.datatables.net`; esos recursos son dependencias del origen, no librerías
que el extractor deba inyectar.

Se retiraron los headers globales `Sec-Fetch-*`, `Sec-Ch-Ua-*` y
`Upgrade-Insecure-Requests` del extractor. Forzar `Sec-Fetch-Dest: document`
y `Sec-Fetch-Mode: navigate` en todos los requests también falseaba los
requests de scripts/Ajax. Chromium ahora calcula sus metadatos por request;
se conserva únicamente la preferencia de idioma. Chromium local rechazó el
script antes de llegar al servidor con `net::ERR_INVALID_ARGUMENT` usando
los headers antiguos. Una regresión con Chromium y servidor local reproduce
ese fallo (o el rechazo HTTP de metadatos de navegación en un script), y
verifica script/Ajax con metadatos nativos y carga correcta tras el cambio.
No demuestra qué política aplican hoy los CDN: el siguiente run autorizado
debe confirmar la recuperación, sin reducir comprobaciones ni publicar datos
parciales si continúa el fallo.
