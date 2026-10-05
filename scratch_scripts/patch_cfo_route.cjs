const fs = require('fs');
const file = 'src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

// Add import
const importTarget = "import GerenteDashboard from './pages/GerenteDashboard';";
const importReplacement = "import GerenteDashboard from './pages/GerenteDashboard';\nimport CfoDashboard from './pages/CfoDashboard';";
content = content.replace(importTarget, importReplacement);

// Add route
const routeTarget = `<Route path="/legal-admin" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'director_maestria', 'superadmin']} requireSuperAdmin={false}>
              <LegalStatusPanel />
            </RoleRoute>
          } />`;
          
const routeReplacement = `<Route path="/legal-admin" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'director_maestria', 'superadmin']} requireSuperAdmin={false}>
              <LegalStatusPanel />
            </RoleRoute>
          } />
          <Route path="/cfo-dashboard" element={
            <RoleRoute allowedRoles={['cfo', 'ceo', 'superadmin', 'direccion']} requireSuperAdmin={false}>
              <CfoDashboard />
            </RoleRoute>
          } />`;

content = content.replace(routeTarget, routeReplacement);
fs.writeFileSync(file, content);
console.log('CfoDashboard route registered');
