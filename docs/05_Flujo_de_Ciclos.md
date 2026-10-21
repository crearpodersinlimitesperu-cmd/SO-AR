# 5. Flujo de Ciclos

El ciclo es la unidad de tiempo central.

1. **Inicio:** Se define la fecha del C1.
2. **Preparación (Pre-C1):** Tareas de confirmación, pagos y logística.
3. **Ejecución (C1):** Operación de fin de semana.
4. **Seguimiento (Post-C1/Pre-C2):** Seguimiento a indecisos y confirmación para C2.
5. **Ejecución (C2):** Fin de semana del C2.
6. **Cierre:** Consolidación, maestría y apertura del nuevo ciclo.

## Asignaciones y calendarios

El Asignador de Entrenadores es la fuente autorizada de asignaciones y ajustes
operativos. La hoja oficial aporta el cronograma base y el histórico; sus nombres
de entrenadores son sugerencias, no asignaciones confirmadas.

El calendario global público, Inicio y el calendario de equipo comparten la
proyección de `public/trainerCalendarProjection.js`. El matching exige fecha,
sede, entrenamiento y equipo; un documento sin equipo solo sirve como referencia
si no hay ambigüedad. Un vínculo explícito al ID original permite cambiar fecha,
sede o equipo sin crear otra asignación ni perder su histórico.

Las proyecciones públicas usan listas permitidas de campos: nombres confirmados
y datos operativos, sin correos de entrenadores ni identidad del editor. El
publicador y la aplicación usan el mismo plan de reconciliación. Los IDs
operativos nuevos coinciden con el documento privado; los antiguos prefijos
`override__` y `custom__` se reconocen sin duplicar eventos. No se borran documentos
canónicos ni bitácoras al reconciliar.

La acción de agregar eventos a Google Calendar sigue siendo una exportación
puntual al calendario del usuario, con memoria local por navegador. No actualiza
automáticamente eventos ya exportados, no importa cambios de Google y no es una
sincronización bidireccional.

`npm run test:calendars` usa fixtures sintéticos, escritura simulada y una prueba
del calendario público compilado con acceso externo bloqueado. No ejecuta el
publicador ni necesita credenciales de producción.
