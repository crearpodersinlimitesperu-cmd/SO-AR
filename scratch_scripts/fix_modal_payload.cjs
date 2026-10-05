const fs = require('fs');
const file = 'src/components/LegalOnboardingModal.jsx';
let content = fs.readFileSync(file, 'utf8');

const target = `participantId: currentUser?.email || '',
        participantName: currentUser?.name || currentUser?.displayName || '',`;
const replacement = `participantId: currentUser?.email || kycData.email || '',
        participantName: currentUser?.name || currentUser?.displayName || kycData.fullName || '',`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Fixed modal payload');
