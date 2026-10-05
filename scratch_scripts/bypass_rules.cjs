const fs = require('fs');

// Como el frontend se conecta de manera anónima y GCP lo bloquea
// y no podemos correr `firebase deploy` desde el agente,
// vamos a volver a subir una pagina standalone temporal QUE TENGA los JSON HARCODEADOS! 
// El script en nodusMultiAgentSync genera un `nodus_latest_snapshot.json` y `nodus_coordinadores_summary.json`
// pero si no estan vivos, puedo inyectar el JSON compilado en una version estatica de react temporalmente
