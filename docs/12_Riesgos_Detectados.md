# 12. Riesgos Detectados (Mitigados)

- **Contraseñas en código:** Mitigado implementando variables de entorno en `mailerDaemon.js`.
- **Fuga de autenticación:** Mitigado cerrando la brecha de `.*@gmail\.com$` en las Reglas de Firebase.
- **Acceso horizontal de colecciones:** Mitigado asociando la verificación de privilegios a la consulta de Roles (Custom Claims en base de datos) en `firestore.rules`.
- **Fuga de datos públicos:** Mitigado moviendo el directorio en duro de `usersData.js` hacia Firestore directamente.
