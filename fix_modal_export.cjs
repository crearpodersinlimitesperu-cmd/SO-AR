const fs = require('fs');
const file = 'src/components/LegalOnboardingModal.jsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('export default LegalOnboardingModal;')) {
  content += '\nexport default LegalOnboardingModal;\n';
  fs.writeFileSync(file, content);
}
