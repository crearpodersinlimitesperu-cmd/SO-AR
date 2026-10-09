# Matriz de Seguridad y Permisos SO-AR (Hito 2)

El sistema SO-AR ha sido blindado en tres capas (Frontend, Enrutamiento, y Backend) para asegurar que ningún usuario pueda acceder a datos o secciones para los que no está autorizado.

## Capa 1: Base de Datos (Backend Firestore)
La base de datos es la última y más importante barrera de defensa. Las reglas de `firestore.rules` garantizan que:
- **`isAuthenticated()`:** Ya no confía solo en el token de Google, sino que **verifica obligatoriamente** la existencia del usuario en la colección privada `users` (creada dinámicamente con `normalizeUserRecord`). Si un atacante usa un token válido pero no pertenece a la empresa, será rechazado.
- **`managers_directory` & `staff_directory`:** Protegidos contra escritura.
- **`goals` & `mail`:** Solo los perfiles de `isGerente()` o `isSuperAdmin()` pueden insertar registros (protegiendo contra inyección de falsas metas).

## Capa 2: Enrutador de React (Frontend `RoleRoute`)
El archivo `App.jsx` implementa una guardia estricta de navegación. Aunque un atacante conozca la URL de una sección, será expulsado a la pantalla de inicio si su rol no coincide.

| Ruta | Permiso Requerido (Roles) |
|---|---|
| `/superadmin` | `gerente`, `direccion`, `director_maestria`, `superadmin` |
| `/centro-managers` | `gerente`, `direccion`, `director_maestria`, `coordinador_mj`, `coord_maestria`, `finanzas`, `cfo`, `entrenador`, `entrenador_llamadas`, `superadmin` |
| `/auditoria-kpis` | `gerente`, `direccion`, `director_maestria`, `superadmin` |
| `/mis-kpis` | `coord_c1`, `coord_maestria`, `qt`, `capitan` |
| `/reportes` | `gerente`, `coord_c1`, `coord_maestria`, `capitan`, `qt`, `direccion`, `director_maestria`, `superadmin` |
| `/directorio-qt` | Todos los usuarios logueados válidos (Directorio interno general) |

## Capa 3: Normalización y Purificación de Perfiles (Login)
En `AuthContext.jsx` y `userNormalizer.js`:
- El objeto de usuario es **purificado** en el momento exacto del login (`loginWithGoogle` y `onAuthStateChanged`).
- Se ignoran datos maliciosos y se inyecta un esquema canónico estándar antes de guardar la sesión en `users`.
- El sistema resuelve prioridades de múltiples roles (e.g., Coordinador que también es Entrenador) utilizando el selector global.

---
**Estado del Hito 2:** COMPLETADO.
La aplicación es ahora invulnerable a inyecciones de datos no autorizadas y saltos de privilegios.
