const fs = require('fs');
const file = 'src/pages/Home.jsx';
let content = fs.readFileSync(file, 'utf8');

// Update TOOL_LINKS with trainer-hub
const toolsTarget = `{ id: 'maestria-global', label: 'Comando Global Maestría', emoji: '🎯', route: '/maestria-global', roles: null, visible: (u) => ['director_maestria', 'direccion', 'superadmin', 'ceo'].includes(u?.appRole) || u?.isSuperAdmin },`;
const toolsReplacement = `{ id: 'maestria-global', label: 'Comando Global Maestría', emoji: '🎯', route: '/maestria-global', roles: null, visible: (u) => ['director_maestria', 'direccion', 'superadmin', 'ceo'].includes(u?.appRole) || u?.isSuperAdmin },
  { id: 'trainer-hub', label: 'Academia y Hub de Entrenamiento', emoji: '🎓', route: '/trainer-hub', roles: null, visible: (u) => ['entrenador', 'direccion', 'superadmin', 'ceo', 'director_maestria'].includes(u?.appRole) || u?.isSuperAdmin },`;
content = content.replace(toolsTarget, toolsReplacement);

fs.writeFileSync(file, content);
console.log('Home.jsx patched with Trainer Hub button');
