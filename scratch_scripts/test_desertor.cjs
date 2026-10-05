const fs = require('fs');
const content = fs.readFileSync('src/pages/CentroManagers.jsx', 'utf8');
console.log(content.includes('normalizeManagerEstado'));
