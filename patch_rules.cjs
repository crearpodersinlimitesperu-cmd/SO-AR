const fs = require('fs');
const file = 'firestore.rules';
let content = fs.readFileSync(file, 'utf8');

const legalRules = `
    // =========================================================================
    // MODULO LEGAL - Onboarding Legal y Firmas
    // =========================================================================
    match /px_legal_signatures/{signatureId} {
      // 1. Data Admins pueden leer y escribir TODO (acceso irrestricto al panel legal)
      // 2. Cualquier usuario autenticado puede leer y escribir SUS PROPIOS documentos legales
      allow read: if request.auth != null && (
        (request.auth.token.email in ["jose.sanchez@crearpsl.net", "contabilidad.global@crearpsl.net", "legal@crearpsl.net"]) ||
        (request.auth.token.email != null && resource.data.participant_id == request.auth.token.email.lower())
      );
      
      allow write: if request.auth != null && (
        (request.auth.token.email in ["jose.sanchez@crearpsl.net", "contabilidad.global@crearpsl.net", "legal@crearpsl.net"]) ||
        // Permitir que el usuario cree su propio registro
        (request.resource.data.participant_id == request.auth.token.email.lower()) ||
        // Permitir que el usuario actualice su propio registro (optimistic updates/PDF)
        (resource.data.participant_id == request.auth.token.email.lower())
      );
    }
`;

if (!content.includes('px_legal_signatures')) {
  content = content.replace(/match \/users\/\{userId\} \{/, legalRules + '\n    match /users/{userId} {');
  fs.writeFileSync(file, content);
  console.log('Added px_legal_signatures rules');
} else {
  console.log('Rules already exist');
}
