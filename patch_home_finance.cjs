const fs = require('fs');
const file = 'src/pages/Home.jsx';
let content = fs.readFileSync(file, 'utf8');

// Update TOOL_LINKS with finance-workspace
const toolsTarget = `{ id: 'cfo-dashboard', label: 'Dirección Financiera Global', emoji: '🏦', route: '/cfo-dashboard', roles: null, visible: (u) => ['cfo', 'ceo', 'superadmin', 'direccion'].includes(u?.appRole) || u?.isSuperAdmin },`;
const toolsReplacement = `{ id: 'cfo-dashboard', label: 'Dirección Financiera Global', emoji: '🏦', route: '/cfo-dashboard', roles: null, visible: (u) => ['cfo', 'ceo', 'superadmin', 'direccion'].includes(u?.appRole) || u?.isSuperAdmin },
  { id: 'finance-workspace', label: 'Operativa Financiera', emoji: '💸', route: '/finance-workspace', roles: null, visible: (u) => ['finanzas', 'facturacion', 'contador', 'cfo', 'superadmin'].includes(u?.appRole) },`;
content = content.replace(toolsTarget, toolsReplacement);

fs.writeFileSync(file, content);
console.log('Home.jsx patched with Finance Workspace button');
