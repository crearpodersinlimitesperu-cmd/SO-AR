# Plan de Rollback — Copiloto Analítico (Groq / Cloudflare Worker)

Nota: la versión anterior de este documento mencionaba "Remote Config" para apagar el componente — esa integración no existe en el código de SO-AR. Este es el plan real, basado en lo que sí existe hoy.

## Si el problema está en el backend (Cloudflare Worker)

1. **Apagado inmediato sin tocar código**: en el dashboard de Cloudflare → Workers & Pages → `so-ar-copiloto` → Settings → Disable, o por CLI desde `cloudflare-worker/`:
   ```
   npx wrangler delete
   ```
   Con el Worker apagado, el navegador recibe un error de red al llamarlo, que `AICopilot.jsx` ya maneja mostrando un mensaje claro al usuario en vez de fallar en silencio.

2. **Revocar la key de Groq** si se sospecha que quedó expuesta (poco probable con esta arquitectura, ya que nunca sale del servidor, pero por si acaso): en console.groq.com → API Keys → revocar, generar una nueva, y volver a correr `npx wrangler secret put GROQ_API_KEY`.

3. **Revocar la Service Account de Google** si se sospecha que la clave JSON quedó expuesta: en Google Cloud Console → IAM y administración → Cuentas de servicio → `copiloto-worker` → Claves → eliminar la clave comprometida, generar una nueva, y repetir el paso de `wrangler secret put FIREBASE_SERVICE_ACCOUNT_JSON`.

## Si el problema está en el frontend (AICopilot.jsx)

4. **Revertir el commit** que cambió `AICopilot.jsx` para volver a la versión anterior:
   ```
   git revert <hash-del-commit>
   ```
   o, si se prefiere no perder el historial, restaurar el archivo puntual:
   ```
   git checkout <commit-anterior> -- src/components/AICopilot.jsx
   ```
   Luego `npm run build` + `firebase deploy --only hosting`.

## Datos de usuarios (historial de chats)

5. **No se pierde nada**: el historial en `users/{uid}/copilot_chats` no se toca en ningún escenario de rollback — solo se apaga el mecanismo que genera respuestas nuevas. Los chats guardados siguen siendo legibles por el usuario dueño.

## Verificación post-rollback

6. Abrir el Copiloto como un usuario normal y confirmar que el mensaje de error es claro (no una pantalla en blanco ni un error técnico crudo), y que el resto de la plataforma (fuera del Copiloto) sigue funcionando con normalidad.
