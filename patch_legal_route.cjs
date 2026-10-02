const fs = require('fs');
const file = 'src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes("import LegalCommandCenter")) {
  const importTarget = "import HrCommandCenter from './pages/HrCommandCenter';";
  const importReplacement = "import HrCommandCenter from './pages/HrCommandCenter';\nimport LegalCommandCenter from './pages/LegalCommandCenter';";
  content = content.replace(importTarget, importReplacement);

  const routeTarget = `<Route path="/hr-command-center" element={
            <RoleRoute allowedRoles={['talento_humano', 'rrhh', 'superadmin', 'ceo', 'direccion']} requireSuperAdmin={false}>
              <HrCommandCenter />
            </RoleRoute>
          } />`;
            
  const routeReplacement = `<Route path="/hr-command-center" element={
            <RoleRoute allowedRoles={['talento_humano', 'rrhh', 'superadmin', 'ceo', 'direccion']} requireSuperAdmin={false}>
              <HrCommandCenter />
            </RoleRoute>
          } />
          <Route path="/legal-hub" element={
            <RoleRoute allowedRoles={['legal', 'juridico', 'superadmin', 'ceo']} requireSuperAdmin={false}>
              <LegalCommandCenter />
            </RoleRoute>
          } />`;

  content = content.replace(routeTarget, routeReplacement);
  fs.writeFileSync(file, content);
  console.log('LegalCommandCenter route registered');
} else {
  console.log('LegalCommandCenter route already exists');
}
