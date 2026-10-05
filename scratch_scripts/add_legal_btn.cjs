const fs = require('fs');
const file = 'src/pages/Home.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Añadir isDataAdmin al import de permissions.js
const permImportRegex = /(import\s+\{)([\s\S]*?)(\}\s+from\s+['"]\.\.\/config\/permissions['"];)/;
content = content.replace(permImportRegex, (match, p1, p2, p3) => {
  if (p2.includes('isDataAdmin')) return match;
  return p1 + '\n  isDataAdmin,' + p2 + p3;
});

// 2. Añadir el módulo a MODULE_REGISTRY
const moduleRegistryRegex = /(const MODULE_REGISTRY = \[\s*[\s\S]*?)(\];)/;
content = content.replace(moduleRegistryRegex, (match, p1, p2) => {
  if (p1.includes("id: 'panel-legal'")) return match;
  const newModule = `  { id: 'panel-legal', label: 'Auditoría Legal (Firmas)', emoji: '⚖️', route: '/legal-admin', roles: null, visible: (u) => isDataAdmin(u) },\n`;
  return p1 + newModule + p2;
});

fs.writeFileSync(file, content);
console.log('Botón Panel Legal añadido a Home.jsx');
