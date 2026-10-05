const fs = require('fs');
const file = 'src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes("import CallCoachCRM")) {
  const importTarget = "import TrainerZenHub from './pages/TrainerZenHub';";
  const importReplacement = "import TrainerZenHub from './pages/TrainerZenHub';\nimport CallCoachCRM from './pages/CallCoachCRM';";
  content = content.replace(importTarget, importReplacement);

  const routeTarget = `<Route path="/trainer-hub" element={
            <RoleRoute allowedRoles={['entrenador', 'direccion', 'superadmin', 'ceo', 'director_maestria']} requireSuperAdmin={false}>
              <TrainerZenHub />
            </RoleRoute>
          } />`;
            
  const routeReplacement = `<Route path="/trainer-hub" element={
            <RoleRoute allowedRoles={['entrenador', 'direccion', 'superadmin', 'ceo', 'director_maestria']} requireSuperAdmin={false}>
              <TrainerZenHub />
            </RoleRoute>
          } />
          <Route path="/call-coach-crm" element={
            <RoleRoute allowedRoles={['entrenador_llamadas', 'direccion', 'superadmin', 'ceo']} requireSuperAdmin={false}>
              <CallCoachCRM />
            </RoleRoute>
          } />`;

  content = content.replace(routeTarget, routeReplacement);
  fs.writeFileSync(file, content);
  console.log('CallCoachCRM route registered');
} else {
  console.log('CallCoachCRM route already exists');
}
