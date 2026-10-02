const fs = require('fs');
const file = 'src/pages/Home.jsx';
let content = fs.readFileSync(file, 'utf8');

const toolsTarget = `{ id: 'call-coach-crm', label: 'CRM Entrenadores de Llamadas', emoji: '📞', route: '/call-coach-crm', roles: null, visible: (u) => ['entrenador_llamadas', 'direccion', 'superadmin', 'ceo'].includes(u?.appRole) || u?.isSuperAdmin },`;
const toolsReplacement = `{ id: 'call-coach-crm', label: 'CRM Entrenadores de Llamadas', emoji: '📞', route: '/call-coach-crm', roles: null, visible: (u) => ['entrenador_llamadas', 'direccion', 'superadmin', 'ceo'].includes(u?.appRole) || u?.isSuperAdmin },
  { id: 'qt-hub', label: 'Hub Operativo QT', emoji: '⚡', route: '/qt-hub', roles: null, visible: (u) => ['qt', 'gerente', 'superadmin', 'ceo'].includes(u?.appRole) || u?.isSuperAdmin },`;

if (!content.includes("qt-hub")) {
  content = content.replace(toolsTarget, toolsReplacement);
  fs.writeFileSync(file, content);
  console.log('Home.jsx patched with QT Hub button');
} else {
  console.log('Already added');
}
