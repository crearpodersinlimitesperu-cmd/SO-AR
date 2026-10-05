# Misión IMO — campañas por sede, equipo de ingreso y C1

## Lógica acordada con José (5 de octubre de 2026)

IMO es la persona que enrola a alguien a entrenarse, como mínimo en C1. Su rol de PX, manager o capitán no cambia esa relación. El equipo de origen del IMO y el equipo de ingreso del enrolado se guardan por separado. Creación, Relación, Gratitud y El Viaje son fines de semana de MJ, no etiquetas permanentes de equipos. Los números N−1/N−2/N−3 solo sugieren una búsqueda; nunca asignan automáticamente personas ni etapas.

## Uso

En Monitor de IMOs, abrir Generar enlace. Elegir sede, equipo de ingreso, fecha C1 y equipos de origen a consultar. Seleccionar los IMOs disponibles, revisar sus enrolados y quitar los que correspondan a otro C1. Confirmar revisión y generar. No se crean carpetas ni se editan paquetes JavaScript. Las campañas ya generadas se listan para reutilizar el enlace. Se puede cerrar su acceso conservando el historial.

El usuario pidió acceso mediante enlace compartido y selección de nombre, sin Google. El identificador aleatorio de campaña limita el acceso al grupo que recibe el enlace; **no verifica identidad**. Quien tenga el enlace puede seleccionar cualquier perfil de esa campaña. Compartir solo con ese grupo. Cada cambio registra perfil declarado, sesión de navegador, hora de servidor, antes y después. No se atribuye a una cuenta autenticada.

Una campaña nueva empieza sin confirmaciones. Los registros anteriores permanecen en una vista separada del Monitor. No se migran ni se reasignan automáticamente personas históricas: el generador exige revisión. Si no hay fuentes en Nodus, actualizar allí las asignaciones antes de generar. Los links antiguos pasan a una página que pide el enlace vigente, pues su URL no identifica inequívocamente el C1 ni sus participantes.

## Persistencia y permisos

- `imo_campaign_keys`: clave privada e inmutable sede/equipo/fecha para impedir duplicaciones concurrentes.
- `imo_campaigns/{id aleatorio}`: metadatos; no se permite enumerarlos sin permiso de gerencia.
- `imo_missions/{id}`: manifiesto canónico privado e inmutable, con origen, destino y procedencia.
- `imo_campaigns/{id}/profiles/{missionId}`: proyección mínima compartida, sin teléfonos personales de enrolados ni correos internos.
- `imo_confirmations` y `imo_events`, bajo cada perfil: confirmación e historial en una transacción; las reglas obligan a guardar ambos y verifican el estado anterior. No permiten borrar eventos.

El Monitor recibe confirmaciones mediante collection-group y muestra historial. Asistencia confirmada y contacto deben ser verdaderos para completar. No se equipara confirmación con asistencia efectiva ni con graduación.

La gestión privada usa la lista de gerencia/dirección ya existente en `isGerenteODireccion()` de Firestore. Los roles del navegador no conceden permisos adicionales. Esa lista debe mantenerse actualizada; esta entrega no modifica cargos de usuarios.

## Pruebas

`node --test scripts/tests/imo-model.test.mjs`

Las reglas se prueban con `scripts/tests/imo-rules.mjs`, un proyecto **demo-imo** y `FIRESTORE_EMULATOR_HOST`. El script rechaza ejecución sin emulador. Requiere `@firebase/rules-unit-testing`, Firebase SDK y Java 21 para el emulador. `IMO_TEST_DEPENDENCIES` admite la ruta a un package.json con dependencias de pruebas aisladas.

Pruebas: generación atómica, acceso por enlace, rechazo de enumeración pública, recuperación de checks, cambios acompañados de historial, inmutabilidad de eventos y cierre de campañas. Se verificó el flujo del portal en navegador con datos sintéticos y persistencia después de recargar. No se crean campañas de prueba en producción.
