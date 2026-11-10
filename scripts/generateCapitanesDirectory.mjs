import fs from 'fs';
import path from 'path';

// Cargar managersData
const managersFilePath = '/Users/joseluissanchezmoreno/.copilot/repos/SO-AR/src/data/managersData.js';
const rawContent = fs.readFileSync(managersFilePath, 'utf8');
const match = rawContent.match(/export const INITIAL_MANAGERS = (\[[\s\S]*?\]);/);
if (!match) {
  console.error("No se pudo parsear INITIAL_MANAGERS");
  process.exit(1);
}

const data = eval(match[1]);

function inferSede(c) {
  if (c.sede && c.sede !== 'Sin Sede') {
    if (c.sede === 'Medellin') return 'Medellín';
    return c.sede;
  }
  const tel = String(c.telefono || '').replace(/\D/g, '');
  const eq = (c.equipo || '').toUpperCase();
  const coord = (c.coordinador || '').toUpperCase();

  if (eq.includes('CUENCA') || coord.includes('CUENCA') || coord.includes('KERLY') || coord.includes('REINOSO')) return 'Cuenca';
  if (eq.includes('QUITO') || coord.includes('QUITO') || coord.includes('LEANDRO') || coord.includes('BRUNIS')) return 'Quito';
  if (eq.includes('GUAYAQUIL') || coord.includes('GUAYAQUIL') || eq.includes('GYE')) return 'Guayaquil';
  if (eq.includes('MEDELLIN') || eq.includes('MEDELLÍN') || coord.includes('MEDELLIN')) return 'Medellín';
  if (eq.includes('LIMA') || coord.includes('LIMA') || coord.includes('JOYCE') || coord.includes('DIANA') || coord.includes('LINID') || coord.includes('LEYLA')) return 'Lima';
  if (eq.includes('CDMX') || eq.includes('MEXICO') || eq.includes('MÉXICO')) return 'CDMX';

  if (tel.startsWith('51') || (tel.length === 9 && tel.startsWith('9'))) return 'Lima';
  if (tel.startsWith('57')) return 'Medellín';
  if (tel.startsWith('52')) return 'CDMX';
  if (tel.startsWith('593') || (tel.length === 10 && tel.startsWith('09'))) {
    if (c.numEquipo >= 13 && c.numEquipo <= 17) return 'Quito';
    return 'Quito / Guayaquil';
  }
  return 'Global / Por Confirmar';
}

function cleanPhone(raw) {
  if (!raw) return 'Sin teléfono';
  let clean = String(raw).trim();
  const digits = clean.replace(/\D/g, '');
  if (!clean.startsWith('+')) {
    if (digits.startsWith('51') && digits.length === 11) {
      clean = `+51 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
    } else if (digits.startsWith('593') && digits.length >= 11) {
      clean = `+593 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
    } else if (digits.startsWith('57') && digits.length >= 11) {
      clean = `+57 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
    } else if (digits.startsWith('52') && digits.length >= 12) {
      clean = `+52 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
    } else if (digits.length === 9 && digits.startsWith('9')) {
      clean = `+51 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    } else if (digits.length === 10 && digits.startsWith('09')) {
      clean = `+593 ${digits.slice(1, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }
  }
  return clean;
}

const rawCaps = data.filter(m => (m.rol || '').toLowerCase().includes('capitan'));

const map = new Map();

rawCaps.forEach(m => {
  const sede = inferSede(m);
  const nombre = m.nombre.trim();
  const equipo = (m.equipo || (m.numEquipo ? `Equipo ${m.numEquipo}` : 'Equipo Sin Nombre')).trim();
  const key = `${nombre.toLowerCase()}|${equipo.toLowerCase()}`;

  map.set(key, {
    id: m.id,
    nombre: nombre,
    rol: (m.rol || '').toUpperCase().includes('CAPITANA') ? 'Capitana' : 'Capitán',
    telefono: cleanPhone(m.telefono),
    sede: sede,
    numEquipo: m.numEquipo || null,
    equipo: equipo,
    entrenador: (m.entrenador || 'Sin asignar').trim(),
    coordinador: (m.coordinador || 'Sin asignar').trim(),
    estado: m.estado || 'Activo'
  });
});

// Incorporar capitanes confirmados de últimas cohortes oficiales
const officialRecent = [
  {
    nombre: 'Anita Esperanza Flores Tipismana',
    rol: 'Capitana',
    telefono: '+51 998 795 068',
    sede: 'Lima',
    numEquipo: 32,
    equipo: 'EQUIPO 32 (Creación E32)',
    entrenador: 'Elmer Andrés Idrobo Andrade',
    coordinador: 'Linid Valencia / Joyce Marín',
    estado: 'Activa'
  },
  {
    nombre: 'Raquel Riveros',
    rol: 'Capitana',
    telefono: '+51 961 292 396',
    sede: 'Lima',
    numEquipo: 31,
    equipo: 'EQUIPO 31 (Creación E31)',
    entrenador: 'Carlos Andrés Gómez Gómez',
    coordinador: 'Linid Valencia / Diana Moscoso',
    estado: 'Activa'
  },
  {
    nombre: 'Fernando Lopez Lopez',
    rol: 'Capitán',
    telefono: '+51 930 256 099',
    sede: 'Lima',
    numEquipo: 30,
    equipo: 'EQUIPO 30 (Creación E30)',
    entrenador: 'Alonso Solares Salazar',
    coordinador: 'Linid Valencia / Joyce Marín',
    estado: 'Activo'
  },
  {
    nombre: 'Giovanna Palomino Marcos',
    rol: 'Capitana',
    telefono: '+51 922 042 189',
    sede: 'Lima',
    numEquipo: 28,
    equipo: 'EQUIPO 28 (Creación E28)',
    entrenador: 'Ernesto Alejandro Díaz Pabón',
    coordinador: 'Linid Valencia / Leyla Pasquel',
    estado: 'Graduada'
  }
];

officialRecent.forEach(c => {
  const key = `${c.nombre.toLowerCase()}|${c.equipo.toLowerCase()}`;
  map.set(key, c);
});

const list = Array.from(map.values());

const sedesOrder = ['Lima', 'Quito', 'Guayaquil', 'Cuenca', 'Medellín', 'CDMX', 'Quito / Guayaquil', 'Global / Por Confirmar'];

list.sort((a, b) => {
  const idxA = sedesOrder.indexOf(a.sede);
  const idxB = sedesOrder.indexOf(b.sede);
  if (idxA !== idxB) return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  const numA = a.numEquipo || parseInt((a.equipo || '').replace(/\D/g, '')) || 0;
  const numB = b.numEquipo || parseInt((b.equipo || '').replace(/\D/g, '')) || 0;
  if (numA !== numB) return numA - numB;
  return a.nombre.localeCompare(b.nombre);
});

// Guardar JSON en src/data/capitanesSedesEquipos.json
const jsonOutput = {
  metadata: {
    titulo: 'Directorio Maestro de Capitanes de Todas las Sedes y Equipos',
    plataforma: 'Causa OS · CREAR Poder Sin Límites',
    fechaGeneracion: '2026-11-09T20:45:00-05:00',
    totalCapitanes: list.length,
    sedes: Array.from(new Set(list.map(c => c.sede)))
  },
  capitanes: list
};

fs.writeFileSync('/Users/joseluissanchezmoreno/.copilot/repos/SO-AR/src/data/capitanesSedesEquipos.json', JSON.stringify(jsonOutput, null, 2), 'utf8');

// Guardar en public/data/capitanesSedesEquipos.json
if (!fs.existsSync('/Users/joseluissanchezmoreno/.copilot/repos/SO-AR/public/data')) {
  fs.mkdirSync('/Users/joseluissanchezmoreno/.copilot/repos/SO-AR/public/data', { recursive: true });
}
fs.writeFileSync('/Users/joseluissanchezmoreno/.copilot/repos/SO-AR/public/data/capitanesSedesEquipos.json', JSON.stringify(jsonOutput, null, 2), 'utf8');

// Generar Markdown completo
let md = `# 👑 Directorio Oficial de Capitanes de Todas las Sedes y Equipos
**CREAR Poder Sin Límites · Causa OS**  
*Actualizado al 09 de Noviembre de 2026*  
**Total de Capitanes Registrados:** ${list.length}

---

## 📊 Resumen Ejecutivo por Sede

| Sede | Cantidad de Capitanes | Estado Principal |
| :--- | :---: | :--- |
`;

const bySede = {};
list.forEach(c => {
  bySede[c.sede] = bySede[c.sede] || [];
  bySede[c.sede].push(c);
});

Object.keys(bySede).forEach(s => {
  md += `| **${s}** | ${bySede[s].length} | Activo / Graduado |\n`;
});

md += `\n---\n\n`;

Object.keys(bySede).forEach(sede => {
  md += `## 📍 Sede: ${sede.toUpperCase()} (${bySede[sede].length} Capitanes)\n\n`;
  md += `| # | Equipo | Capitán / Capitana | Rol | Teléfono / WhatsApp | Entrenador(a) | Coordinador(a) | Estado |\n`;
  md += `| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  bySede[sede].forEach((c, idx) => {
    const waPhone = c.telefono.replace(/\D/g, '');
    const waLink = waPhone ? `[${c.telefono}](https://wa.me/${waPhone})` : c.telefono;
    md += `| ${idx + 1} | **${c.equipo}** | **${c.nombre}** | ${c.rol} | ${waLink} | ${c.entrenador} | ${c.coordinador} | \`${c.estado}\` |\n`;
  });

  md += `\n`;
});

fs.writeFileSync('/Users/joseluissanchezmoreno/.copilot/repos/SO-AR/DIRECTORIO_OFICIAL_CAPITANES.md', md, 'utf8');
console.log(`✅ Archivos generados con éxito: ${list.length} capitanes consolidados.`);
