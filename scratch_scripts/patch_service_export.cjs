const fs = require('fs');
const file = 'src/services/legalSignatureService.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("const generateSignedContractHTML = (data) => {", "export const generateSignedContractHTML = (data) => {");

fs.writeFileSync(file, content);
console.log('Exported generateSignedContractHTML');
