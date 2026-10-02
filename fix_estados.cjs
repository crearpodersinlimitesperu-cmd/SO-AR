const fs = require('fs');
const file = 'src/pages/CentroManagers.jsx';
let content = fs.readFileSync(file, 'utf8');

// Remover el que quedó mal puesto
content = content.replace("teams[key].estados.add(normalizeManagerEstado(m.estado));", "");

// Insertarlo de manera segura
const target = "if (!teams[key]) {";
const replacement = "teams[key].estados.add(normalizeManagerEstado(m.estado));\n      if (!teams[key]) {";
// wait, if I put it before if (!teams[key]), teams[key] is undefined!

// Let's replace the whole block to be safe.
const oldBlock = `      if (!teams[key]) {
        teams[key] = { equipoKey: key, sede, equipo: m.equipo, numEquipo: m.numEquipo, entrenadores: new Set(), estados: new Set(), cierreManual: null };
      }`;
const newBlock = `      if (!teams[key]) {
        teams[key] = { equipoKey: key, sede, equipo: m.equipo, numEquipo: m.numEquipo, entrenadores: new Set(), estados: new Set(), cierreManual: null };
      }
      teams[key].estados.add(normalizeManagerEstado(m.estado));`;

content = content.replace(oldBlock, newBlock);
fs.writeFileSync(file, content);
