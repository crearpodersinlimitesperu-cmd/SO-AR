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

La consulta de 2026-10-11 (run `38155744260`) quedó bloqueada antes de inspeccionar
las fuentes: `/dashboard` respondió HTTP 403 (`landing_route_rejected`). Se
detuvo sin reintentar el inicio de sesión ni eludir controles. No se verificó el
contrato de calendario/aliados y no se conecta una fuente supuesta a la página.
Para continuar hace falta un acceso de lectura autorizado que pueda abrir esa
ruta, o un contrato/API/exportación autorizado con sede, equipo, etapa, medida,
fechas y marcas de actualización explícitas. Corregir el acceso debe hacerse por
el administrador de Nodus; no implica sustituir el dato ausente por cuotas
guardadas ni por confirmaciones telefónicas.
