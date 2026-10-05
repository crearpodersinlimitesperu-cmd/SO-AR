const fs = require('fs');

const path = './src/pages/MonitorImos.jsx';
let content = fs.readFileSync(path, 'utf8');

const regex1 = /const match = filterEquipo\.match\(\/\\\\d\+\/\);/g;
const replacement1 = `const match = filterEquipo.match(/E?\\s*(\\d+)/i);`;

content = content.replace(regex1, replacement1);

const regex2 = /eqStr = 'e' \+ match\[0\];/g;
const replacement2 = `eqStr = 'e' + match[1];`;

content = content.replace(regex2, replacement2);

fs.writeFileSync(path, content, 'utf8');
console.log("Logica de regex reparada para evitar que C1E30 devuelva e1");
