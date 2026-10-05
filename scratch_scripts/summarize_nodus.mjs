import fs from 'fs';

try {
  const nodusFiRaw = fs.readFileSync('./src/data/nodusFuturosImposiblesData.js', 'utf8');
  // Simple extraction since it's a JS file exporting an array
  const jsonStrMatch = nodusFiRaw.match(/export const NODUS_FUTUROS_IMPOSIBLES_PARTICIPANTES = (\[[\s\S]*?\]);/);
  let fiData = [];
  if (jsonStrMatch) {
    fiData = JSON.parse(jsonStrMatch[1]);
  }

  const enroladosRaw = fs.readFileSync('./src/data/nodusEnroladosRecords.json', 'utf8');
  const enroladosData = JSON.parse(enroladosRaw);

  const managersRaw = fs.readFileSync('./src/data/managersData.js', 'utf8');
  let managersData = [];
  const mgrStrMatch = managersRaw.match(/export const MANAGERS_DB = (\[[\s\S]*?\]);/);
  if (mgrStrMatch) {
    // Some JS might need eval or careful parsing if it has no strict JSON format. 
    // Just count occurrences of 'sede:' and 'equipo:'
  }

  const sedes = {};

  // Process FIs (Participants)
  fiData.forEach(p => {
    const sede = p.sede || 'Desconocida';
    if (!sedes[sede]) sedes[sede] = { equipos: new Set(), participantes: 0, enrolados: 0, managers: 0 };
    sedes[sede].participantes++;
    if (p.equipo) sedes[sede].equipos.add(p.equipo);
  });

  // Process Enrolados
  enroladosData.forEach(e => {
    const sede = e.sede || 'Desconocida';
    if (!sedes[sede]) sedes[sede] = { equipos: new Set(), participantes: 0, enrolados: 0, managers: 0 };
    sedes[sede].enrolados++;
  });

  // Output Summary
  console.log("=== RESUMEN DE DATOS NODUS (LOCAL) ===");
  for (const [sede, data] of Object.entries(sedes)) {
    console.log(`\nSEDE: ${sede.toUpperCase()}`);
    console.log(`- Equipos activos: ${Array.from(data.equipos).sort().join(', ') || 'N/A'}`);
    console.log(`- Participantes (FIs): ${data.participantes}`);
    console.log(`- Enrolamientos (IMOs): ${data.enrolados}`);
  }

} catch (e) {
  console.error("Error analyzing:", e);
}
