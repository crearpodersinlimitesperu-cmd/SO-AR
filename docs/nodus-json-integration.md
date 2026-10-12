# Integración con la API JSON de Nodus

La única referencia del contrato HTTP es `https://imo.crearpslglobal.com/docs/api_consulta.md`.
El cliente `scripts/nodusApiClient.mjs` implementa los cinco endpoints documentados:
sedes, equipos, participantes por equipo, ficha por identificación y pagos por rango.

## Credencial y perímetro

Las llamadas se hacen desde Node.js en servicios o automatizaciones de servidor, o
desde el Worker autenticado usando `NODUS_API_KEY` como secreto de Cloudflare. No usar
variables `VITE_*`, Firestore abierto, URLs con token ni llamadas directas desde el
navegador. No registrar cabeceras, cuerpo de participantes, identificaciones, pagos ni
el texto libre de errores del servidor.

`NODUS_USER` y `NODUS_PASSWORD` son credenciales de navegador y no sustituyen el token
de API. `NODUS_API_KEY` debe configurarse como secreto de Cloudflare Workers, fuera de
Actions; nunca debe copiarse al bundle, a Firestore ni a logs.

El Worker ofrece `/nodus-json/catalog` y `/nodus-json/team-metrics` mediante POST con
Bearer ID token de Firebase. El catálogo devuelve totales generales a otros roles,
limita coordinadores a la sede guardada en su usuario y reserva la vista global a
gerencia; las métricas detalladas solo están disponibles para coordinadores con sede y
gerencia. Los agregados no incluyen identificaciones, teléfonos, correos ni nombres.
El endpoint de métricas calcula conteos únicamente desde booleanos documentados y
separa valores desconocidos; no infiere llamadas, graduación ni etapas que la API no
expone. La pantalla Embudo de Conversión usa esta fuente y ya no rotula snapshots como
“live” ni presenta proyecciones fijas como resultados Nodus. Configura el secreto del
Worker con `npx wrangler secret put NODUS_API_KEY` antes de desplegar; sin él, las rutas
devuelven un estado explícito de servicio no configurado.

Para desplegar el Worker sin exponer la clave se añadió el workflow manual
`.github/workflows/deploy-nodus-json-worker.yml`. Requiere los secretos Actions
`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` y `NODUS_API_KEY`; instala el secreto en
Cloudflare, ejecuta las pruebas del Worker y despliega, y verifica que la ruta protegida
conteste con autenticación requerida. No activa el despliegue automáticamente.

## Contrato fail-closed

- Solo HTTPS al host publicado y método GET, con el token en `X-Api-Key`.
- Exige HTTP exitoso, `ok: true`, `data` y `meta.generado` ISO con zona horaria.
- Rechaza datos con más de 24 horas, fechas futuras fuera de tolerancia, JSON/esquema
  inválido, API deshabilitada, falta de token y fallos de red. No convierte errores
  ni filtros vacíos en arreglos que parezcan exitosos.
- Valida identificadores, formato de fechas y el máximo documentado de 93 días para
  pagos. Cuando se envía `id_equipo` a pagos, no envía `id_sede`, conforme al contrato.
- No reintenta autenticación ni conserva como actuales datos viejos cuando una
  petición falla. Los consumidores deben mostrar el error y el timestamp de origen.

## Alcance semántico

El contrato documenta sedes/equipos activos, participantes y sus estados/pagos de C1/C2,
fichas individuales y pagos confirmados o abonos. No documenta las llamadas 1.ª/2.ª,
gestiones de coordinador, acceso/roles, etapas de campaña ni todos los KPI históricos
que hoy consumen algunos agentes. No se deben inferir esos campos desde registros,
pagos, etapa vigente ni asistencia.

La API puede responder PII y pagos; antes de publicarlos en Firestore hay que definir
por consumidor los campos mínimos, sede/rol autorizados, reglas de lectura, retención y
auditoría. No publicar el objeto completo de participantes o facturas como snapshot
global. Los agentes que necesitan campos no cubiertos mantienen su fuente actual hasta
que Nodus documente y autorice su equivalente JSON. La fuente actual debe seguir
identificada y sus errores/frescura no se deben ocultar.

## Pruebas

`scripts/tests/nodus-api-client.test.mjs` usa respuestas sintéticas. Cubre transporte,
autenticación sin fuga del token a URL, sobre JSON, errores 4xx/5xx, freshness,
validación de fechas y precedencia de filtros. No hace peticiones productivas.
El workflow manual `Nodus JSON API audit (read only)` valida únicamente `/sedes` y
`/equipos?en_actividad=1`, contrasta sus IDs y publica solo conteos y `meta.generado`
en el log sanitizado. No actualiza Firestore ni elige un equipo de la interfaz.
`cloudflare-worker/src/nodusJsonModel.test.js` cubre los alcances global/sede/general,
el filtrado de sedes y agregados que preservan estados desconocidos. Ejecuta
`npm run test:nodus-json` para las pruebas sintéticas de esta integración.
