import fs from 'fs';

const fiRaw = fs.readFileSync('./src/data/nodusFuturosImposiblesData.js', 'utf8');
const fiData = JSON.parse(fiRaw.match(/export const NODUS_FUTUROS_IMPOSIBLES_PARTICIPANTES = (\[[\s\S]*?\]);/)[1]);

const enroladosRaw = fs.readFileSync('./src/data/nodusEnroladosRecords.json', 'utf8');
const enroladosData = JSON.parse(enroladosRaw);

const mgrRaw = fs.readFileSync('./src/data/managersData.js', 'utf8');
const mgrData = JSON.parse(mgrRaw.match(/export const INITIAL_MANAGERS = (\[[\s\S]*?\]);/)[1]);

const db = {
  Lima: { equipos: new Set(), particos: 0, managers: 0, enrolados: 0 },
  Quito: { equipos: new Set(), particos: 0, managers: 0, enrolados: 0 },
  Cuenca: { equipos: new Set(), particos: 0, managers: 0, enrolados: 0 },
  Guayaquil: { equipos: new Set(), particos: 0, managers: 0, enrolados: 0 },
  Medellin: { equipos: new Set(), particos: 0, managers: 0, enrolados: 0 },
  Mexico: { equipos: new Set(), particos: 0, managers: 0, enrolados: 0 },
};

function normSede(s) {
  if (!s) return null;
  const n = s.toLowerCase();
  if (n.includes('lima')) return 'Lima';
  if (n.includes('quito')) return 'Quito';
  if (n.includes('cuenca')) return 'Cuenca';
  if (n.includes('guayaquil')) return 'Guayaquil';
  if (n.includes('medell')) return 'Medellin';
  if (n.includes('mex') || n.includes('cdmx')) return 'Mexico';
  return null;
}

fiData.forEach(p => {
  const s = normSede(p.sede);
  if (s) {
    db[s].particos++;
    if (p.equipo) db[s].equipos.add(p.equipo);
  }
});

enroladosData.forEach(e => {
  const s = normSede(e.sede);
  if (s) {
    db[s].enrolados++;
    // Enrolados often have the HQ in the name like "EQUIPO 30 - LIMA CICLO 1"
  }
});

mgrData.forEach(m => {
  const s = normSede(m.sede);
  if (s) {
    db[s].managers++;
    if (m.numEquipo) {
       // We'll store it by number to count how many distinct teams
       db[s].equipos.add(`Equipo ${m.numEquipo}`);
    }
  }
});

console.log("=== RESUMEN POR SEDE EN NODUS ===");
Object.keys(db).forEach(sede => {
  const d = db[sede];
  const sortedEq = Array.from(d.equipos).sort();
  console.log(`\n📍 ${sede.toUpperCase()}`);
  console.log(`Participantes (FI): ${d.particos}`);
  console.log(`Managers: ${d.managers}`);
  console.log(`Enrolados Registrados: ${d.enrolados}`);
  console.log(`Equipos Activos Mapeados (${sortedEq.length}): ${sortedEq.slice(0, 10).join(', ')}${sortedEq.length > 10 ? ' ...' : ''}`);
});

