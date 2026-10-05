const fs = require('fs');
const file = 'src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

// Add import
const importTarget = "import CfoDashboard from './pages/CfoDashboard';";
const importReplacement = "import CfoDashboard from './pages/CfoDashboard';\nimport FinanceWorkspace from './pages/FinanceWorkspace';";
content = content.replace(importTarget, importReplacement);

// Add route
const routeTarget = `<Route path="/cfo-dashboard" element={
            <RoleRoute allowedRoles={['cfo', 'ceo', 'superadmin', 'direccion']} requireSuperAdmin={false}>
              <CfoDashboard />
            </RoleRoute>
          } />`;
          
const routeReplacement = `<Route path="/cfo-dashboard" element={
            <RoleRoute allowedRoles={['cfo', 'ceo', 'superadmin', 'direccion']} requireSuperAdmin={false}>
              <CfoDashboard />
            </RoleRoute>
          } />
          <Route path="/finance-workspace" element={
            <RoleRoute allowedRoles={['finanzas', 'facturacion', 'contador', 'cfo', 'superadmin', 'direccion']} requireSuperAdmin={false}>
              <FinanceWorkspace />
            </RoleRoute>
          } />`;

content = content.replace(routeTarget, routeReplacement);
fs.writeFileSync(file, content);
console.log('FinanceWorkspace route registered');
