const fs = require('fs');
const file = 'src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes("import AndresCommandCenter")) {
  const importTarget = "import LegalCommandCenter from './pages/LegalCommandCenter';";
  const importReplacement = "import LegalCommandCenter from './pages/LegalCommandCenter';\nimport AndresCommandCenter from './pages/AndresCommandCenter';";
  content = content.replace(importTarget, importReplacement);

  const routeTarget = `<Route path="/legal-hub" element={
            <RoleRoute allowedRoles={['legal', 'juridico', 'superadmin', 'ceo']} requireSuperAdmin={false}>
              <LegalCommandCenter />
            </RoleRoute>
          } />`;
            
  const routeReplacement = `<Route path="/legal-hub" element={
            <RoleRoute allowedRoles={['legal', 'juridico', 'superadmin', 'ceo']} requireSuperAdmin={false}>
              <LegalCommandCenter />
            </RoleRoute>
          } />
          <Route path="/andres-command-center" element={
            <RoleRoute allowedRoles={['coord_maestria_global', 'director_maestria', 'superadmin', 'ceo']} requireSuperAdmin={false}>
              <AndresCommandCenter />
            </RoleRoute>
          } />`;

  content = content.replace(routeTarget, routeReplacement);
  fs.writeFileSync(file, content);
  console.log('AndresCommandCenter route registered');
} else {
  console.log('AndresCommandCenter route already exists');
}
