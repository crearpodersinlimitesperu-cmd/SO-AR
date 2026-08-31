# Pruebas de Concurrencia

- **Carga Base**: 50 peticiones simultáneas usando el SDK de Groq.
- **Validación de Caché**: Verificación de que las múltiples lecturas a Firebase en un minuto no excedan la cuota gracias a la caché de cliente local.
