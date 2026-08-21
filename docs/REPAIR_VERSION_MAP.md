# Mapa de Versiones y Diagnóstico (SO-AR)

| Archivo | Versiones encontradas | Versión usada actualmente | Problemas | Acción propuesta |
|---|---|---|---|---|
| `src/context/AuthContext.jsx` | Múltiples (audit log vs source) | V1.2 | Validación estricta por `email`, falta `emails`, bugs de Auth | Normalizar carga y login progresivo. |
| `src/pages/GerenteDashboard.jsx` | 1 | V1.0 | Variables no declaradas, `usersData` vacío | Corregir dependencias, inyectar contextos adecuados, refactorizar vistas. |
| `src/services/firebase.js` | 1 | V1.0 | Dependencias posiblemente obsoletas. | Conservar pero revisar exportaciones Auth y DB. |
| `src/data/cyclesData.js` | 1 | V1.0 | Riesgo de ciclos duplicados y hardcoded | Mover fuente a Firestore y dejar fallback seguro local. |
| `src/pages/GoalsBoard.jsx` | 1 | V1.0 | Cálculos estáticos o erróneos | Refactorizar lógica de cálculo y división. |
| `src/pages/SuperAdminPanel.jsx` | 1 | V1.0 | Visibilidad sin jerarquía clara | Implementar helper `normalizeRole()` y RBAC. |
| `src/config/permissions.js` | 1 | V1.1 | Implementado parcialmente | Centralizar validaciones y extender `normalizeRole`. |
| `firestore.rules` | 1 | Producción Actual | Mínimo privilegio no implementado; reglas `if isAuthenticated()` peligrosas. | Migrar a RBAC estricto basado en claims o base de datos. |

---
*Nota: Este mapa se irá expandiendo conforme avance la auditoría detallada (Fase 2).*
