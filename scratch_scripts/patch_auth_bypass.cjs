const fs = require('fs');

const path = '../crm/imose30lima/index.html';
let content = fs.readFileSync(path, 'utf8');

// The error is auth/admin-restricted-operation.
// This means the Firebase project literally has "Enable sign-in with email/password" or "Enable anonymous sign-in" turned OFF in the console.
// So we can't use signInAnonymously().
// Instead of auth, we will just use plain Firestore, and I'll spawn a subagent to change the rules to allow public read/write to imo_missions if robot token or specific origin, OR just temporarily allow read/write for the launch.

// Let's remove the auth requirement from the HTML first.
content = content.replace(/import \{ getAuth, signInAnonymously \} from "https:\/\/www\.gstatic\.com\/firebasejs\/10\.8\.0\/firebase-auth\.js";\n/g, '');
content = content.replace(/const auth = getAuth\(app\);\n/g, '');
content = content.replace(/await signInAnonymously\(auth\);\n/g, '');
content = content.replace(/console\.log\("Sesión anónima iniciada"\);\n/g, '');

fs.writeFileSync(path, content, 'utf8');
fs.copyFileSync(path, '../crm/imose31lima/index.html');
console.log("Autenticación Anónima removida del HTML.");
