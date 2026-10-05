const fs = require('fs');
const file = 'src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes("import TrainerZenHub")) {
  const importTarget = "import MaestriaGlobalDashboard from './pages/MaestriaGlobalDashboard';";
  const importReplacement = "import MaestriaGlobalDashboard from './pages/MaestriaGlobalDashboard';\nimport TrainerZenHub from './pages/TrainerZenHub';";
  content = content.replace(importTarget, importReplacement);

  const routeTarget = `<Route path="/maestria-global" element={
            <RoleRoute allowedRoles={['director_maestria', 'direccion', 'superadmin', 'ceo']} requireSuperAdmin={false}>
              <MaestriaGlobalDashboard />
            </RoleRoute>
          } />`;
            
  const routeReplacement = `<Route path="/maestria-global" element={
            <RoleRoute allowedRoles={['director_maestria', 'direccion', 'superadmin', 'ceo']} requireSuperAdmin={false}>
              <MaestriaGlobalDashboard />
            </RoleRoute>
          } />
          <Route path="/trainer-hub" element={
            <RoleRoute allowedRoles={['entrenador', 'direccion', 'superadmin', 'ceo', 'director_maestria']} requireSuperAdmin={false}>
              <TrainerZenHub />
            </RoleRoute>
          } />`;

  content = content.replace(routeTarget, routeReplacement);
  fs.writeFileSync(file, content);
  console.log('TrainerZenHub route registered');
} else {
  console.log('TrainerZenHub route already exists');
}
