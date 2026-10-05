const fs = require('fs');

const path = '../crm/imose30lima/index.html';
let content = fs.readFileSync(path, 'utf8');

// Replace the filter logic to be dynamic based on the URL
const replacement = `
          // Detectar equipo desde la URL (ej. /imose30lima/ -> 30)
          const urlPath = window.location.pathname;
          let expectedTeamNumber = "30"; // default
          const match = urlPath.match(/e(\\d+)/i);
          if(match) expectedTeamNumber = match[1];

          misiones = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(m => m.equipo && m.equipo.toUpperCase().includes(\`EQUIPO \${expectedTeamNumber}\`));
`;

content = content.replace(/misiones = snap\.docs\.map[^;]+;/, replacement);
fs.writeFileSync(path, content, 'utf8');

// Also copy this to imose31lima so both are fixed and dynamic!
fs.copyFileSync(path, '../crm/imose31lima/index.html');
console.log("HTML Dinámico aplicado a E30 y E31");
