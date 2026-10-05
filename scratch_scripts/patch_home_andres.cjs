const fs = require('fs');
const file = 'src/pages/Home.jsx';
let content = fs.readFileSync(file, 'utf8');

const toolsTarget = `{ id: 'legal-hub', label: 'Torre de Riesgo (Legal)', emoji: '⚖️', route: '/legal-hub', roles: null, visible: (u) => ['legal', 'juridico', 'superadmin', 'ceo'].includes(u?.appRole) || u?.isSuperAdmin },`;
const toolsReplacement = `{ id: 'legal-hub', label: 'Torre de Riesgo (Legal)', emoji: '⚖️', route: '/legal-hub', roles: null, visible: (u) => ['legal', 'juridico', 'superadmin', 'ceo'].includes(u?.appRole) || u?.isSuperAdmin },
  { id: 'andres-command-center', label: 'Comando Maestría (Andrés)', emoji: '🌐', route: '/andres-command-center', roles: null, visible: (u) => ['coord_maestria_global', 'director_maestria', 'superadmin', 'ceo'].includes(u?.appRole) || u?.isSuperAdmin },`;

if (!content.includes("andres-command-center")) {
  content = content.replace(toolsTarget, toolsReplacement);
  fs.writeFileSync(file, content);
  console.log('Home.jsx patched with Andres Hub button');
} else {
  console.log('Already added');
}
