const fs = require('fs');
const file = 'src/pages/LegalStatusPanel.jsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = "window.open(`https://nodus-cpsl.web.app/search?q=${s.participantId}`, '_blank')";
const replaceStr = "navigate(`/crm-maestro`)";

content = content.replace(targetStr, replaceStr);

const targetText = "Verificar en Nodus";
const replaceText = "Verificar en CRM Base (Nodus)";

content = content.replace(targetText, replaceText);

fs.writeFileSync(file, content);
console.log('Fixed panel nodus link');
