import fs from 'fs';
const htmlPath = '../crm/imose30lima/index.html';
let content = fs.readFileSync(htmlPath, 'utf8');

// The original logic connects to Firebase anonymously and blocked us. 
// We temporarily bypass it by having the react code use the local token mechanism maybe?
