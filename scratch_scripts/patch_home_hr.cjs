const fs = require('fs');
const file = 'src/pages/Home.jsx';
let content = fs.readFileSync(file, 'utf8');

const toolsTarget = `{ id: 'qt-hub', label: 'Hub Operativo QT', emoji: '⚡', route: '/qt-hub', roles: null, visible: (u) => ['qt', 'gerente', 'superadmin', 'ceo'].includes(u?.appRole) || u?.isSuperAdmin },`;
const toolsReplacement = `{ id: 'qt-hub', label: 'Hub Operativo QT', emoji: '⚡', route: '/qt-hub', roles: null, visible: (u) => ['qt', 'gerente', 'superadmin', 'ceo'].includes(u?.appRole) || u?.isSuperAdmin },
  { id: 'hr-command-center', label: 'HR Command Center', emoji: '🏢', route: '/hr-command-center', roles: null, visible: (u) => ['talento_humano', 'rrhh', 'superadmin', 'ceo', 'direccion'].includes(u?.appRole) || u?.isSuperAdmin },`;

if (!content.includes("hr-command-center")) {
  content = content.replace(toolsTarget, toolsReplacement);
  fs.writeFileSync(file, content);
  console.log('Home.jsx patched with HR Hub button');
} else {
  console.log('Already added');
}
