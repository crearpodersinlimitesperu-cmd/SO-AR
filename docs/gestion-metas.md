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
asistencia permanece sin verificar; no se sustituye por cuotas ni llamadas.

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
ni se ofrece sincronizarlo a `currentValue`. Calendario por etapa y asistencia
siguen sin contrato Nodus verificado.

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
