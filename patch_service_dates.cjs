const fs = require('fs');
const file = 'src/services/legalSignatureService.js';
let content = fs.readFileSync(file, 'utf8');

const target = `const generateSignedContractHTML = (data) => {
  const now = new Date();`;

const replacement = `export const generateSignedContractHTML = (data) => {
  const now = data.signed_at?.toDate ? data.signed_at.toDate() : (data.signed_at ? new Date(data.signed_at) : new Date());`;

content = content.replace(/export const generateSignedContractHTML = \(data\) => \{\s*const now = new Date\(\);/, replacement);

fs.writeFileSync(file, content);
console.log('Fixed historical dates in HTML generator');
