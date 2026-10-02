const fs = require('fs');
const file = 'src/pages/Home.jsx';
let content = fs.readFileSync(file, 'utf8');

// Update TOOL_LINKS with call-coach-crm
const toolsTarget = `{ id: 'trainer-hub', label: 'Academia y Hub de Entrenamiento', emoji: '🎓', route: '/trainer-hub', roles: null, visible: (u) => ['entrenador', 'direccion', 'superadmin', 'ceo', 'director_maestria'].includes(u?.appRole) || u?.isSuperAdmin },`;
const toolsReplacement = `{ id: 'trainer-hub', label: 'Academia y Hub de Entrenamiento', emoji: '🎓', route: '/trainer-hub', roles: null, visible: (u) => ['entrenador', 'direccion', 'superadmin', 'ceo', 'director_maestria'].includes(u?.appRole) || u?.isSuperAdmin },
  { id: 'call-coach-crm', label: 'CRM Entrenadores de Llamadas', emoji: '📞', route: '/call-coach-crm', roles: null, visible: (u) => ['entrenador_llamadas', 'direccion', 'superadmin', 'ceo'].includes(u?.appRole) || u?.isSuperAdmin },`;

if (content.includes("call-coach-crm")) {
  console.log("Already added");
} else {
  content = content.replace(toolsTarget, toolsReplacement);
  fs.writeFileSync(file, content);
  console.log('Home.jsx patched with Call Coach CRM button');
}
