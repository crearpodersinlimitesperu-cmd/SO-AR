const fs = require('fs');
const file = 'src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

const importStatement = `import LegalStatusPanel from './pages/LegalStatusPanel';\n`;
if (!content.includes('LegalStatusPanel')) {
  // Add import
  content = content.replace("import OnboardingLegal from './pages/OnboardingLegal'", importStatement + "import OnboardingLegal from './pages/OnboardingLegal'");
  
  // Add route - solo para data admin (jose, eli, paul, fer, andres)
  const routeString = `          <Route path="/legal-admin" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'director_maestria', 'superadmin']} requireSuperAdmin={false}>
              <LegalStatusPanel />
            </RoleRoute>
          } />\n`;
          
  content = content.replace('<Route path="/onboarding-legal"', routeString + '          <Route path="/onboarding-legal"');
  
  fs.writeFileSync(file, content);
  console.log('App.jsx patched with /legal-admin route');
} else {
  console.log('App.jsx already has /legal-admin');
}
