const fs = require('fs');
const path = require('path');

const hrFile = path.join(__dirname, 'scripts', 'nodusHrSentinelAgent.mjs');
let hrContent = fs.readFileSync(hrFile, 'utf8');

// 1. Remove firebase/app and firebase/firestore web sdk imports, and firebaseConfig / app / db init
hrContent = hrContent.replace(/import \{ initializeApp, getApps \} from 'firebase\/app';\s+import \{ getFirestore, doc, setDoc, addDoc, collection, serverTimestamp \} from 'firebase\/firestore';\s+const firebaseConfig = \{[\s\S]*?\};\s+const app = getApps\(\)\.length === 0 \? initializeApp\(firebaseConfig\) : getApps\(\)\[0\];\s+const db = getFirestore\(app\);\s+/g, () => '');

// 2. Remove ROBOT_TOKEN check from top level (it will be used, wait, ROBOT_TOKEN is used inside the class? Yes, line 185 and 239)
// If I remove ROBOT_TOKEN check from top level, I need to make sure it's defined or just leave it.
// Let's leave ROBOT_TOKEN.

// 3. Update constructor
hrContent = hrContent.replace(
  /export class NodusHrSentinelAgent \{\s+constructor\(options = \{\}\) \{\s+this\.dryRun = options\.dryRun \|\| false;\s+\}/,
  () => `export class NodusHrSentinelAgent {\n  constructor(adminDb = null, options = {}) {\n    this.db = adminDb;\n    this.dryRun = options.dryRun || false;\n  }`
);

// 4. Update publicarAlertasYCuadroDeMando
hrContent = hrContent.replace(
  /const cuadroRef = doc\(db, 'nodus_hr_sentinel', 'latest'\);\s+await setDoc\(cuadroRef, \{/,
  () => `const cuadroRef = this.db.collection('nodus_hr_sentinel').doc('latest');\n      await cuadroRef.set({`
);

hrContent = hrContent.replace(
  /await db\.collection\('notifications'\)\.add\(alerta\);/g,
  () => `await this.db.collection('notifications').add(alerta);`
);

fs.writeFileSync(hrFile, hrContent, 'utf8');
console.log("HR Sentinel fixed!");

// Fix MultiAgentSync
const multiAgentFile = path.join(__dirname, 'scripts', 'nodusMultiAgentSync.mjs');
let maContent = fs.readFileSync(multiAgentFile, 'utf8');

// Fix DataScientistAgent call
maContent = maContent.replace(
  /const dataScientist = new NodusDataScientistAgent\(firebaseConfig\);/,
  () => `const dataScientist = new NodusDataScientistAgent(getAdminDbForNodusPublish());`
);

// Fix HrSentinelAgent call
maContent = maContent.replace(
  /const hrSentinel = new NodusHrSentinelAgent\(\);/,
  () => `const hrSentinel = new NodusHrSentinelAgent(getAdminDbForNodusPublish());`
);

// Fix hasActivity line
maContent = maContent.replace(
  /const hasActivity = \(Number\(c\.c1\) > 0 \|\| Number\(c\.c2\) > 0 \|\| Number\(c\.gestiones\) > 0\);/,
  () => `const hasActivity = (Number(c.c1) > 0 || Number(c.c2) > 0 || Number(c.gestiones) > 0 || Number(c.asignados) > 0);`
);

fs.writeFileSync(multiAgentFile, maContent, 'utf8');
console.log("MultiAgentSync fixed!");
