const fs = require('fs');
const file = 'src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

const routeTarget = `<Route path="/onboarding-legal" element={<OnboardingLegal />} />`;
const routeReplacement = `<Route path="/onboarding-legal" element={<OnboardingLegal />} />
          <Route path="/dna" element={<OnboardingLegal />} />`;

content = content.replace(routeTarget, routeReplacement);
fs.writeFileSync(file, content);
console.log('Added /dna route');
