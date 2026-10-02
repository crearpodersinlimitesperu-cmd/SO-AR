const fs = require('fs');
const file = 'src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

const targetRoute = `<Route path="/onboarding-legal" element={
            <PrivateRoute>
              <OnboardingLegal />
            </PrivateRoute>
          } />`;
          
const newRoute = `<Route path="/onboarding-legal" element={
            <OnboardingLegal />
          } />`;

content = content.replace(targetRoute, newRoute);
fs.writeFileSync(file, content);
console.log('Made onboarding-legal public');
