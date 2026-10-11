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
