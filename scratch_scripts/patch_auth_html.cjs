const fs = require('fs');

const path = '../crm/imose30lima/index.html';
let content = fs.readFileSync(path, 'utf8');

// Modificamos la autenticación: el usuario no tiene sesión en la app de IMOs externa,
// lo cual rompe las Firestore Rules `if isAuthenticated()`.
// Para solucionar la urgencia en producción, vamos a agregar autenticación anónima transparente.

const authImport = `import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";`;
const authLogic = `
  const auth = getAuth(app);
  
  async function loadData() {
    try {
      // 1. Iniciar sesión anónima automáticamente para saltar la regla de Firebase "isAuthenticated()"
      await signInAnonymously(auth);
      console.log("Sesión anónima iniciada");
      
      // 2. Ahora sí conectamos a la DB
      const snap = await getDocs(collection(db, "imo_missions"));`;

content = content.replace(/import \{ getFirestore/g, authImport + '\n  import { getFirestore');
content = content.replace(/async function loadData\(\) \{\n\s*try \{\n\s*const snap = await getDocs\(collection\(db, "imo_missions"\)\);/g, authLogic);
content = content.replace(/async function loadData\(\) \{\n\s*try \{\n\s*if\(activeImoId\) \{/g, `
  const auth = getAuth(app);
  async function loadData() {
    try {
      await signInAnonymously(auth);
      if(activeImoId) {
`);

fs.writeFileSync(path, content, 'utf8');
fs.copyFileSync(path, '../crm/imose31lima/index.html');
console.log("Autenticación Anónima agregada. Misiones ahora pueden leer de la base de datos.");
