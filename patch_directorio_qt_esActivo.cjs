const fs = require('fs');
const file = 'src/pages/DirectorioQT.jsx';
let content = fs.readFileSync(file, 'utf8');

const target = `// Ocultar inactivos del directorio QT para quienes no son Talento Humano / Super Admin
        loadedMembers = loadedMembers.filter(m => {
          const s = (m.status || m.estado || '').toLowerCase();
          return !s.includes('inactiv');
        });`;

const replacement = `// Ocultar inactivos del directorio QT para quienes no son Talento Humano / Super Admin
        loadedMembers = loadedMembers.filter(m => {
          if (m.esActivo === false) return false;
          const s = (m.status || m.estado || '').toLowerCase();
          return !s.includes('inactiv');
        });`;

content = content.replace(target, replacement);

fs.writeFileSync(file, content);
console.log('DirectorioQT filter logic updated to check esActivo');
