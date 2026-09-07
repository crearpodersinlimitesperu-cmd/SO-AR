import fs from 'fs';
const snap = JSON.parse(fs.readFileSync('nodus_latest_snapshot.json', 'utf8'));

console.log('--- REPORTE DE EQUIPOS Y CICLOS ---');
snap.equiposReporte.forEach(eq => {
  const num = parseInt(eq.equipoNombre.replace(/[^0-9]/g, '')) || 0;
  console.log(`${eq.equipoNombre.padEnd(35)} -> Num: ${num} | ¿Ciclo 2 en nombre? ${eq.equipoNombre.includes('Ciclo 2') || eq.equipoNombre.includes('CICLO 2')}`);
});
