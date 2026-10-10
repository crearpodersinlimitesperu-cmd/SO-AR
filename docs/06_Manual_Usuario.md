# 6. Manual de Usuario

1. **Ingresar:** Pulsa en 'Continuar con Google'.
2. **Pantalla Principal (Mi Día):** Revisa tus prioridades urgentes.
3. **Mi Checklist:** Marca tus tareas a medida que las completes. Si requieren evidencia, sube el archivo.
4. **Mis Metas:** Actualiza el % de avance de tus indicadores.

## Panel sencillo de Elizabeth

Pulsa **Crear tarea**, escribe el título, selecciona una persona de tu equipo,
elige la fecha límite y añade una nota opcional. La fecha vence a las 18:00
en la hora local del navegador. El equipo se obtiene de las personas en las
tareas que ya asignaste, no de coincidencias de apellido ni de un equipo supuesto.
Si aún no hay personas, usa **Abrir Causa OS completo** para la primera asignación
desde el directorio. Al guardar, la tarea aparece en **Tareas que asignaste** y
utiliza las notificaciones habituales.

En simulación no se pueden crear tareas ni confirmar totales privados: se muestra
un aviso y **—**, nunca ceros como si la lectura fuese completa. Durante la carga,
un cambio de identidad o un error tampoco se confirman totales. En una sesión
real, se consultan las tareas autorizadas por creador y asignador sin ampliar los
permisos de Firestore. Las preferencias locales del panel se conservan.

## Flyers por programa, sede y equipo

En `/generador-flyer`, los coordinadores con acceso existente pueden elegir
**Capítulo Uno, Capítulo Dos, Creación, Relación o Gratitud**. La selección
sincroniza la próxima fecha por sede; «Elegir otra fecha/equipo del calendario»
permite escoger otro evento futuro explícito de esa sede. El equipo aparece
junto a la fecha en la vista previa y en el PNG 1080×1920. Se conserva el modo
una sede/todas (hasta seis sedes para mantener el formato 9:16). La descarga
individual incluye sede y equipo, si existe, en un nombre sanitizado.

La fuente es `CyclesContext.events`: `nombre`/`name`, `sede`/`sedeTag`/`place`,
`equipo`/`team`, `fecha_inicio`/`start` y `fecha_fin`/`end`. Se normalizan
acentos, mayúsculas y espacios. Se admiten encabezados completos
`CAPÍTULO UNO`, `CAPÍTULO 1`, `C1`, `CAPÍTULO DOS`, `CAPÍTULO 2`, `C2`,
con equipo explícito opcional (`Equipo 7`, `Eq. #7`, `E7`, incluso `C1E7`).
Para las fases se admiten `CREACIÓN`, `RELACIÓN`, `GRATITUD`, con prefijo
opcional `MJ`, `MAESTRÍA`, `MAESTRÍA DEL JUEGO` o, respectivamente,
`PRIMER FDS`, `SEGUNDO FDS`, `TERCER FDS`; separadores `:`, `-`, `·` y punto
final opcionales. Las sedes se reconocen por palabra/código completo:
México/MEX/CDMX, Lima/LIM, Quito/UIO, Guayaquil/GYE, Cuenca/CUE,
Medellín/MED. No se interpreta `UIO2` como `UIO`.

**Límite deliberado:** un evento genérico `MAESTRÍA DEL JUEGO`, un conjunto
de equipos concatenados, un nombre parcial o `IMPACTO RELACIÓN/GRATITUD`
no permite deducir una fase ni su fecha. No se aplican offsets ni se desglosan
cohortes. Si no existe un evento futuro explícito se muestra
«Sin fechas de [tipo] en el calendario», sin conservar fechas de otro programa.
Estas sedes no se exportan hasta introducir una fecha manual y activarlas.

Se respetan fechas civiles y rangos explícitos. Solo Capítulo Uno conserva
la presentación histórica de tres días inclusivos si falta la fecha final.
En los otros programas se muestra el inicio con «fin por confirmar».
Los campos editados y los presets históricos de Capítulo Uno se marcan
**Manual — no sincronizado**. La actualización automática conserva las
ediciones manuales del mismo programa; cambiar el programa o pulsar
«Sincronizar Calendario» las reemplaza por el calendario. No se escriben
datos de producción, no se envían flyers y no se modifican permisos.
