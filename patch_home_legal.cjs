const fs = require('fs');
const file = 'src/pages/Home.jsx';
let content = fs.readFileSync(file, 'utf8');

const toolsTarget = `{ id: 'hr-command-center', label: 'HR Command Center', emoji: '🏢', route: '/hr-command-center', roles: null, visible: (u) => ['talento_humano', 'rrhh', 'superadmin', 'ceo', 'direccion'].includes(u?.appRole) || u?.isSuperAdmin },`;
const toolsReplacement = `{ id: 'hr-command-center', label: 'HR Command Center', emoji: '🏢', route: '/hr-command-center', roles: null, visible: (u) => ['talento_humano', 'rrhh', 'superadmin', 'ceo', 'direccion'].includes(u?.appRole) || u?.isSuperAdmin },
  { id: 'legal-hub', label: 'Torre de Riesgo (Legal)', emoji: '⚖️', route: '/legal-hub', roles: null, visible: (u) => ['legal', 'juridico', 'superadmin', 'ceo'].includes(u?.appRole) || u?.isSuperAdmin },`;

if (!content.includes("legal-hub")) {
  content = content.replace(toolsTarget, toolsReplacement);
  fs.writeFileSync(file, content);
  console.log('Home.jsx patched with Legal Hub button');
} else {
  console.log('Already added');
}
