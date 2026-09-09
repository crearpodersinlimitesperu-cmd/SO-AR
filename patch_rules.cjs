const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');

const target = `    match /participants/{document=**} {`;
const injection = `    // SUGERENCIAS Y SOPORTE
    match /sugerencias_soporte/{docId} {
      allow create: if isAuthenticated();
      allow read, update, delete: if isSuperAdmin();
    }

    match /participants/{document=**} {`;

rules = rules.replace(target, injection);
fs.writeFileSync('firestore.rules', rules);
