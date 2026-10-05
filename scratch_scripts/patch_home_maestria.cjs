const fs = require('fs');
const file = 'src/pages/Home.jsx';
let content = fs.readFileSync(file, 'utf8');

// Update TOOL_LINKS with maestria-global
const toolsTarget = `{ id: 'finance-workspace', label: 'Operativa Financiera', emoji: '💸', route: '/finance-workspace', roles: null, visible: (u) => ['finanzas', 'facturacion', 'contador', 'cfo', 'superadmin'].includes(u?.appRole) },`;
const toolsReplacement = `{ id: 'finance-workspace', label: 'Operativa Financiera', emoji: '💸', route: '/finance-workspace', roles: null, visible: (u) => ['finanzas', 'facturacion', 'contador', 'cfo', 'superadmin'].includes(u?.appRole) },
  { id: 'maestria-global', label: 'Comando Global Maestría', emoji: '🎯', route: '/maestria-global', roles: null, visible: (u) => ['director_maestria', 'direccion', 'superadmin', 'ceo'].includes(u?.appRole) || u?.isSuperAdmin },`;
content = content.replace(toolsTarget, toolsReplacement);

fs.writeFileSync(file, content);
console.log('Home.jsx patched with Maestria Global button');
