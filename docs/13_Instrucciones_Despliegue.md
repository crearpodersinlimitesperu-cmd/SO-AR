# 13. Instrucciones de Despliegue

Para poner esta aplicación en vivo y accesible desde cualquier navegador:

1. Instalar Firebase CLI: `npm install -g firebase-tools`.
2. Iniciar sesión: `firebase login`.
3. Inicializar: `firebase init hosting`.
4. Construir app: `npm run build`.
5. Desplegar: `firebase deploy`.

## Publicación automática de itinerarios

`.github/workflows/deploy.yml` conserva `push` a `master` y
`workflow_dispatch`. También escucha únicamente la finalización de
`Nodus Flight Monitor Agent (7x Day)` en `master`. El job exige éxito,
nombre exacto, rama `master` y repositorio de origen igual al actual.
No escucha su propio workflow ni descarga artifacts del sincronizador.

El commit del agente usa `GITHUB_TOKEN`, por lo que su push no genera otro
evento `push` de Actions. `workflow_run` cubre ese caso sin ejecutar una
sincronización manual ni modificar el feed. Checkout toma el `master`
actual (no `workflow_run.head_sha`, que precede al commit del JSON).
El resumen del job registra `Deployment source SHA`; la concurrencia de
producción serializa las publicaciones sin cancelar una en curso.
Un sync fallido o de otra rama no publica. Un sync exitoso sin cambios
puede volver a publicar el mismo feed.

La publicación usa las credenciales existentes de Firebase y mantiene
Hosting, reglas e índices como en el flujo previo; no agrega esquemas.
Revisar el resultado real del workflow y el SHA del resumen, y comprobar
read-only `/vuelos_tracker.json` y `/cartas/vuelos_tracker.json` en Hosting
contra los archivos de esa revisión. No disparar el sync ni editar JSON
para probar el encadenamiento: esperar la siguiente ejecución programada.
Si falla el deploy, la última publicación permanece y el workflow informa
el error con el mecanismo existente.
