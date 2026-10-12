# Integración con la API JSON de Nodus

La única referencia del contrato HTTP es `https://imo.crearpslglobal.com/docs/api_consulta.md`.
El cliente `scripts/nodusApiClient.mjs` implementa los cinco endpoints documentados:
sedes, equipos, participantes por equipo, ficha por identificación y pagos por rango.

## Credencial y perímetro

Las llamadas se hacen desde Node.js en servicios o automatizaciones de servidor con
`NODUS_API_KEY` inyectada como secreto. No usar variables `VITE_*`, Firestore abierto,
URLs con token ni llamadas directas desde el navegador. No registrar cabeceras, cuerpo
de participantes, identificaciones, pagos ni el texto libre de errores del servidor.

En la última revisión del repositorio, Actions contiene `NODUS_USER` y
`NODUS_PASSWORD`, pero no `NODUS_API_KEY`. Esas credenciales de navegador no sustituyen
el token de API. No se debe ejecutar una integración productiva ni declarar conectado
un consumidor JSON hasta que el responsable agregue `NODUS_API_KEY` por el gestor
seguro de secretos.

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
