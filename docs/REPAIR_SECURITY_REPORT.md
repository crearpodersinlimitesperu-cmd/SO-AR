# Reporte de Seguridad y Reglas de Acceso (SO-AR)

## 1. Vulnerabilidades Detectadas (Pre-Reparación)
El archivo `firestore.rules` anterior operaba bajo un modelo genérico `if isAuthenticated();`, lo cual presentaba riesgos críticos:
* Cualquier usuario logueado (incluyendo colaboradores base) podía **borrar tareas** asignadas a otros o de otras sedes.
* Cualquier usuario logueado podía **crear, actualizar o eliminar metas**.
* Las notificaciones y los reportes estaban abiertos a sobreescritura accidental.

## 2. Implementación RBAC (Post-Reparación)
Se ha desplegado un estricto modelo de Control de Acceso Basado en Roles (RBAC):

### 2.1. Funciones Centrales (Mínimo Privilegio)
* `isSuperAdmin()`: Restringido a lista blanca estricta (Jose, Armando, Paul) y roles `superadmin / direccion`.
* `isGerente()`: Hereda SuperAdmin + rol explícito `gerente`.
* `isOwner(resource)`: Valida la propiedad directa basada en `ownerId` o `assignedToEmail`.
* `isCollaborator(resource)`: Valida que el email pertenezca al arreglo `collaborators`.

### 2.2. Restricción por Colecciones
* **/tasks:** `create` abierto para delegación. `update` exclusivo para dueños, gerentes, superadmins, o colaboradores (estos últimos restringidos a modificar SOLO el progreso o evidencia, SIN poder reasignar la tarea a nivel base de datos). `delete` bloqueado exclusivamente para Gerentes y SuperAdmins.
* **/goals:** `create`, `update` y `delete` cerrados a Gerentes y SuperAdmins.
* **/reports:** `update` y `delete` exclusivos de Gerentes y SuperAdmins.
* **/user_profiles:** Limitado estrictamente a `request.auth.uid == userDocId`.

## 3. Conclusión
El vector de riesgo de corrupción de datos interna, intencional o accidental, ha sido cerrado exitosamente en la capa de la base de datos (Backend Security).
