const fs = require('fs');
const content = fs.readFileSync('src/pages/AsignadorEntrenadores.jsx', 'utf8');

const regex = /const unicos = \[\.\.\.new Set\(porIdentidad\.values\(\)\)\];/;
const replacement = `// 3. Obtener lista consolidada única
        const unicosMap = new Map();
        porIdentidad.forEach(val => unicosMap.set(identidadCanonicaEntrenador(val.nombre), val));
        const unicos = [...unicosMap.values()];`;

const newContent = content.replace(regex, replacement);
fs.writeFileSync('src/pages/AsignadorEntrenadores.jsx', newContent);
console.log('Fixed duplicates in AsignadorEntrenadores.jsx');
