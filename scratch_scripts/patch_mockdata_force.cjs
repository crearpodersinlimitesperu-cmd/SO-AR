const fs = require('fs');

const path = '../crm/imose30lima/assets/index-BUEJnpaY.js';
let content = fs.readFileSync(path, 'utf8');

// The original minified array:
// equipos:["EQUIPO 28","EQUIPO 29","EQUIPO 30"]

// Let's force replace it regardless of what the regex matched earlier
content = content.replace(/"EQUIPO 28","EQUIPO 29","EQUIPO 30"/g, '"EQUIPO 30"');

fs.writeFileSync(path, content, 'utf8');
console.log('Parcheado E30');

const path31 = '../crm/imose31lima/assets/index-BUEJnpaY.js';
let content31 = fs.readFileSync(path31, 'utf8');
content31 = content31.replace(/"EQUIPO 28","EQUIPO 29","EQUIPO 30"/g, '"EQUIPO 31"');
fs.writeFileSync(path31, content31, 'utf8');
console.log('Parcheado E31');
