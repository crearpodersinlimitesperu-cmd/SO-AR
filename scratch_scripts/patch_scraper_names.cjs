const fs = require('fs');

const path = './scripts/nodusMultiAgentSync.mjs';
let content = fs.readFileSync(path, 'utf8');

const regex = /const nombre = first\(row, \['nombre', 'participante', 'asistente'\]\);/;
const replacement = `const nombrePart = first(row, ['nombre', 'participante', 'asistente']);
        const apellidoPart = first(row, ['apellido']);
        const nombre = (apellidoPart && !nombrePart.toLowerCase().includes(apellidoPart.toLowerCase())) 
          ? \`\${nombrePart} \${apellidoPart}\`.trim() 
          : nombrePart;`;

content = content.replace(regex, replacement);
fs.writeFileSync(path, content, 'utf8');
console.log("Scraper modificado para extraer Apellidos también");
