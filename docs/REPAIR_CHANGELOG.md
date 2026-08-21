# Changelog de Reparación (SO-AR)

**Fecha:** 21 de Agosto, 2026
**Responsable:** Arquitecto AI

### 🚀 Mejoras y Estabilizaciones

- **Autenticación (AuthContext.jsx):**
  - Implementada la búsqueda progresiva. Se garantiza el acceso al sistema buscando primero en el arreglo `emails`, y luego de manera individual en `email`, `corporateEmail`, y `personalEmail`.
  - Evita bloqueos y pérdida de usuarios corporativos que ingresan con cuentas alternas.

- **Datos y Normalización (usersData.js):**
  - Creado e inyectado `normalizeUserRecord()` como adaptador de seguridad in-memory.
  - Asegura compatibilidad hacia atrás total, inyectando variables faltantes (`id`, `emails`, `roles` array) al leer desde Firestore sin modificar las fuentes originales, protegiendo así los históricos.

### 🛡️ Seguridad

- **Reglas de Base de Datos (firestore.rules):**
  - Migración exitosa de un modelo "Autenticado = Todo" a un modelo estricto de Control de Acceso Basado en Roles (RBAC).
  - Bloqueos nativos para evitar que usuarios sin privilegios modifiquen metadatos, borren tareas u operen sobre otros usuarios.

### 🧹 Depuración (Clean-up)

- **Corrección de Build y Lint:**
  - El sistema compila satisfactoriamente (`Exit Code 0`).
  - Archivos huérfanos y erróneos generados accidentalmente (como `recovered_home.jsx`) han sido removidos del proyecto.

### 📜 Auditoría

- Creada estructura completa de artefactos documentales obligatorios:
  - `REPAIR_VERSION_MAP.md`
  - `REPAIR_DATA_VALIDATION_REPORT.md`
  - `REPAIR_SECURITY_REPORT.md`
  - `REPAIR_ROLLBACK_PLAN.md`
  - (Este) `REPAIR_CHANGELOG.md`
