# Arquitectura del Bot Cerrado (Copiloto Analítico)

## 1. Interpretación de la solución
El sistema RAG (Retrieval-Augmented Generation) opera como un Copiloto Analítico 100% interno. Solo responde con información proveniente de Nodus y la base de conocimiento (Notebook). Está blindado contra alucinaciones y búsquedas web, priorizando la precisión, seguridad y brevedad.

## 2. Fuente real de datos
- **Nodus**: Datos transaccionales y operativos extraídos mediante un pipeline hacia Firebase Firestore (`nodus_kpis_sincronizados`).
- **Notebook**: Repositorio de conocimiento interno (`src/assets/notebookKnowledge.js`, duplicado como `cloudflare-worker/src/notebookKnowledge.js` para uso del servidor — ver deuda técnica abajo).

## 3. Arquitectura Lógica (implementada 23/08/2026)

**Backend activo: Cloudflare Workers** (`cloudflare-worker/src/index.js`). Se eligió esto en vez de Firebase Cloud Functions porque el proyecto está en el plan gratuito Spark de Firebase, y Cloud Functions requiere el plan de pago Blaze sin excepción — el equipo decidió no pagar. Cloudflare Workers tiene un plan gratuito real (sin tarjeta) suficiente para este volumen de uso.

1. **Interfaz Privada**: Componente React (`AICopilot.jsx`) con historial en Firestore (`users/{uid}/copilot_chats`, sin cambios respecto a la versión original).
2. **Backend cerrado**: Worker en Cloudflare. El navegador nunca llama directo a ningún proveedor de IA — solo llama a este Worker, mandando su token de sesión de Firebase.
3. **Autenticación**: El Worker verifica la firma del ID Token de Firebase Auth contra las llaves públicas reales de Google (librería `jose`) — rechaza cualquier request sin un token válido y no vencido.
4. **Autorización (RBAC)**: El Worker usa una Service Account de Google (rol mínimo `Cloud Datastore User`, guardada como secreto de Cloudflare, nunca en el repositorio) para leer `users/{uid}` en Firestore vía REST y así saber el rol/sede real del usuario. Filtra el contexto de Nodus según la Matriz de Permisos:
   - Equipo Operativo → solo KPIs generales/agregados.
   - Coordinadores → solo su sede.
   - Gerencia / SuperAdmin → todas las sedes.
5. **Generador (LLM)**: Integración con Groq, modelo `openai/gpt-oss-120b` (verificado contra `console.groq.com/docs/deprecations` el 23/08/2026 — NO usar `llama-3-70b` ni `llama-3.3-70b-versatile`, ambos con retiro anunciado). La API Key de Groq vive únicamente como secreto de Cloudflare, nunca en variables `VITE_*` ni en el bundle del navegador.
6. **Auditoría**: Cada consulta se guarda en `audit_logs` (uid, email, rol, sede, pregunta truncada a 500 caracteres, timestamp) vía la misma Service Account.

**Ruta alternativa (no activa):** `functions/index.js` implementa exactamente la misma lógica como Cloud Function de Firebase, lista para usarse si en algún momento se decide subir a Blaze — no requeriría rehacer nada, solo desplegarla y cambiar a qué backend apunta `AICopilot.jsx`.

## 4. Deuda técnica conocida (no bloqueante, pendiente para una siguiente pasada)
- La base de conocimiento (Notebook) está duplicada en 3 lugares (`src/assets/notebookKnowledge.js`, `functions/notebookKnowledge.js`, `cloudflare-worker/src/notebookKnowledge.js`) por las restricciones de cada entorno de despliegue. Si se actualiza, hay que actualizar los tres o automatizar la sincronización en el build.
- El filtrado de Nodus por sede asume que cada sección de `data.secciones` trae un campo `sede`. No se verificó contra datos reales de producción — si el campo no existe o se llama distinto, un coordinador vería "sin datos" en vez de sus datos reales (falla segura: prefiere ocultar de más a exponer de más, pero hay que confirmarlo con una prueba real).
- La Service Account de Google (`Cloud Datastore User`) tiene acceso de lectura/escritura a TODA la base de Firestore, no solo a las colecciones que usa el Copiloto — es una limitación de cómo funciona el rol de IAM más granular disponible sin configuración adicional (Firestore no tiene permisos por colección a nivel de IAM). El control real sigue siendo: nadie fuera del Worker tiene esa clave.

## 5. Estado
**IMPLEMENTADO, NO DESPLEGADO.** No se declara apto para producción hasta:
- Crear la cuenta de Cloudflare, la Service Account de Google, y configurar los secretos (`docs/BOT_CERRADO_DESPLIEGUE_CLOUDFLARE.md`).
- Desplegar el Worker (`npx wrangler deploy`) y conectar el frontend (`VITE_COPILOTO_WORKER_URL`).
- Ejecutar el Plan de Pruebas (`BOT_CERRADO_PLAN_PRUEBAS.md`) con al menos un usuario real de cada nivel de rol (operativo, coordinador, gerencia).
