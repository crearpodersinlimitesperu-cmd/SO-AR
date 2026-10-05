const fs = require('fs');
const file = 'src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes("import QuantumTeamHub")) {
  const importTarget = "import CallCoachCRM from './pages/CallCoachCRM';";
  const importReplacement = "import CallCoachCRM from './pages/CallCoachCRM';\nimport QuantumTeamHub from './pages/QuantumTeamHub';";
  content = content.replace(importTarget, importReplacement);

  const routeTarget = `<Route path="/call-coach-crm" element={
            <RoleRoute allowedRoles={['entrenador_llamadas', 'direccion', 'superadmin', 'ceo']} requireSuperAdmin={false}>
              <CallCoachCRM />
            </RoleRoute>
          } />`;
            
  const routeReplacement = `<Route path="/call-coach-crm" element={
            <RoleRoute allowedRoles={['entrenador_llamadas', 'direccion', 'superadmin', 'ceo']} requireSuperAdmin={false}>
              <CallCoachCRM />
            </RoleRoute>
          } />
          <Route path="/qt-hub" element={
            <RoleRoute allowedRoles={['qt', 'gerente', 'superadmin', 'ceo']} requireSuperAdmin={false}>
              <QuantumTeamHub />
            </RoleRoute>
          } />`;

  content = content.replace(routeTarget, routeReplacement);
  fs.writeFileSync(file, content);
  console.log('QuantumTeamHub route registered');
} else {
  console.log('QuantumTeamHub route already exists');
}
