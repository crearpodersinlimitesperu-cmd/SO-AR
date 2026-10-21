# 8. Configuración de Checklists

Las plantillas base están en `src/data/checklistData.js`.
Próximamente se migrarán a Firebase para que el Gerente pueda agregar, editar o eliminar tareas desde la interfaz sin tocar código.

Las tareas de catálogo requieren un ciclo con identificador válido antes de guardar.
En Quito se utiliza el ciclo del equipo seleccionado, nunca el de otro equipo como
alternativa. Las tareas personales, personalizadas o con asignación directa conservan
su comportamiento no cíclico. Un fallo de escritura revierte el cambio visual
optimista (sin sustituir snapshots posteriores), se comunica al llamador y no
permite celebrar el cierre.
