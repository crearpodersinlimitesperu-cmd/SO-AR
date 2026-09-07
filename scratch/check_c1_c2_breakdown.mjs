import fs from 'fs';
const snap = JSON.parse(fs.readFileSync('nodus_latest_snapshot.json', 'utf8'));

console.log('--- REVISIÓN DE EQUIPOS Y SENTADOS C1 VS C2 ---');

// In CREAR, how are C1 and C2 teams identified?
// Let's check team names in c.equipos
const allTeams = new Set();
snap.coordinadores.forEach(c => {
  (c.equipos || []).forEach(eq => {
    allTeams.add(eq.equipo);
  });
});
console.log('Total equipos únicos en coordinadores:', allTeams.size);

// Also check equiposReporte where we have full names like "EQUIPO 120 — QUITO CICLO 2 ✓"
console.log('\n--- Equipos en reporte ---');
const reportMap = {};
snap.equiposReporte?.forEach(eq => {
  reportMap[eq.equipoNombre] = eq;
  console.log(eq.equipoNombre, '-> Asistieron:', eq.participantes.filter(p => p.asistencia === 'Asistió').length);
});

// Check how coordinator teams map to C1 vs C2
snap.coordinadores.filter(c => c.asistieron > 0).slice(0, 6).forEach(c => {
  console.log(`\nCoordinador: ${c.nombre} (${c.sede}) - asistieron:${c.asistieron}, c1:${c.c1}, c2:${c.c2}`);
  c.equipos.filter(e => e.asistieron > 0).forEach(e => {
    console.log(`  - ${e.equipo}: asist=${e.asistieron}, llamadas=${e.llamadas}, conf=${e.confirmado}`);
  });
});
