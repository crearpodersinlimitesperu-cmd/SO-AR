const fs = require('fs');
const file = 'src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes("import HrCommandCenter")) {
  const importTarget = "import QuantumTeamHub from './pages/QuantumTeamHub';";
  const importReplacement = "import QuantumTeamHub from './pages/QuantumTeamHub';\nimport HrCommandCenter from './pages/HrCommandCenter';";
  content = content.replace(importTarget, importReplacement);

  const routeTarget = `<Route path="/qt-hub" element={
            <RoleRoute allowedRoles={['qt', 'gerente', 'superadmin', 'ceo']} requireSuperAdmin={false}>
              <QuantumTeamHub />
            </RoleRoute>
          } />`;
            
  const routeReplacement = `<Route path="/qt-hub" element={
            <RoleRoute allowedRoles={['qt', 'gerente', 'superadmin', 'ceo']} requireSuperAdmin={false}>
              <QuantumTeamHub />
            </RoleRoute>
          } />
          <Route path="/hr-command-center" element={
            <RoleRoute allowedRoles={['talento_humano', 'rrhh', 'superadmin', 'ceo', 'direccion']} requireSuperAdmin={false}>
              <HrCommandCenter />
            </RoleRoute>
          } />`;

  content = content.replace(routeTarget, routeReplacement);
  fs.writeFileSync(file, content);
  console.log('HrCommandCenter route registered');
} else {
  console.log('HrCommandCenter route already exists');
}
