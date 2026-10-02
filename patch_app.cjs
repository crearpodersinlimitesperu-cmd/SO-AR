const fs = require('fs');
const file = 'src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

const importStatement = `import OnboardingLegal from './pages/OnboardingLegal';\n`;
if (!content.includes('OnboardingLegal')) {
  // Add import
  content = content.replace("import Login from './pages/Login'", importStatement + "import Login from './pages/Login'");
  
  // Add route
  const routeString = `          <Route path="/onboarding-legal" element={
            <PrivateRoute>
              <OnboardingLegal />
            </PrivateRoute>
          } />\n`;
          
  content = content.replace('<Route path="/home"', routeString + '          <Route path="/home"');
  
  fs.writeFileSync(file, content);
  console.log('App.jsx patched with /onboarding-legal route');
} else {
  console.log('App.jsx already has /onboarding-legal');
}
