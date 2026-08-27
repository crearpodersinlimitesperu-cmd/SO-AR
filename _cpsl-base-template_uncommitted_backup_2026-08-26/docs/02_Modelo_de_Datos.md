# 2. Modelo de Datos

Estructura de Firestore:

- `users`: { id, name, email, role, team, supervisor, status }
- `cycles`: { id, name, startDate, endDate, stages (C1, C2, Maestria) }
- `tasks`: { id, cycleId, title, roleId, status, isCritical, hasEvidence }
- `goals`: { id, cycleId, ownerId, kpi, progress, evidenceRequired }
- `evidences`: { id, taskId, fileUrl, comments, status }
