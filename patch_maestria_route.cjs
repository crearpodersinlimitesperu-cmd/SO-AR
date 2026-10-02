const fs = require('fs');
const file = 'src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

// Add import
const importTarget = "import FinanceWorkspace from './pages/FinanceWorkspace';";
const importReplacement = "import FinanceWorkspace from './pages/FinanceWorkspace';\nimport MaestriaGlobalDashboard from './pages/MaestriaGlobalDashboard';";
content = content.replace(importTarget, importReplacement);

// Add route
const routeTarget = `<Route path="/finance-workspace" element={
            <RoleRoute allowedRoles={['finanzas', 'facturacion', 'contador', 'cfo', 'superadmin', 'direccion']} requireSuperAdmin={false}>
              <FinanceWorkspace />
            </RoleRoute>
          } />`;
          
const routeReplacement = `<Route path="/finance-workspace" element={
            <RoleRoute allowedRoles={['finanzas', 'facturacion', 'contador', 'cfo', 'superadmin', 'direccion']} requireSuperAdmin={false}>
              <FinanceWorkspace />
            </RoleRoute>
          } />
          <Route path="/maestria-global" element={
            <RoleRoute allowedRoles={['director_maestria', 'direccion', 'superadmin', 'ceo']} requireSuperAdmin={false}>
              <MaestriaGlobalDashboard />
            </RoleRoute>
          } />`;

content = content.replace(routeTarget, routeReplacement);
fs.writeFileSync(file, content);
console.log('MaestriaGlobalDashboard route registered');
