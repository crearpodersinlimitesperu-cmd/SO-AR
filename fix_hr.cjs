const fs = require('fs');
let content = fs.readFileSync('scripts/nodusHrSentinelAgent.mjs', 'utf8');

// 1. imports
content = content.replace('import { initializeApp, getApps } from "firebase/app";\r\nimport { getFirestore, doc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";\r\n', '');
content = content.replace('import { initializeApp, getApps } from "firebase/app";\nimport { getFirestore, doc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";\n', '');
// Note: we need FieldValue for serverTimestamp!
content = content.replace(/export class NodusHrSentinelAgent \{/, "import { FieldValue } from 'firebase-admin/firestore';\n\nexport class NodusHrSentinelAgent {");

// 2. constructor
content = content.replace(/export class NodusHrSentinelAgent \{[\s\S]*?this\.db = getFirestore\(app\);\s*\}/, "export class NodusHrSentinelAgent {\n  constructor(adminDb = null) {\n    this.db = adminDb;\n  }");

// 3. setDoc
content = content.replace(/const cuadroRef = doc\(this\.db, 'nodus_cuadro_mando_hr', 'latest'\);\r?\n\s*await setDoc\(cuadroRef, \{/, "const cuadroRef = this.db.collection('nodus_cuadro_mando_hr').doc('latest');\n      await cuadroRef.set({");

// 4. serverTimestamp
content = content.replace(/serverTimestamp\(\)/g, "FieldValue.serverTimestamp()");

// 5. addDoc
content = content.replace(/await addDoc\(collection\(db, 'notifications'\), alerta\);/g, "await db.collection('notifications').add(alerta);");

// 6. Normalizer HR
const hrNormalizer = "const normalizeSede = (s) => {\n          if (!s) return 'GLOBAL';\n          const n = String(s).trim().toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');\n          if (n.includes('quito')) return 'Quito';\n          if (n.includes('cuenca')) return 'Cuenca';\n          if (n.includes('guayaquil') || n.includes('gye')) return 'Guayaquil';\n          if (n.includes('medellin')) return 'Medellín';\n          if (n.includes('lima')) return 'Lima';\n          if (n.includes('mex') || n.includes('cdmx')) return 'México';\n          return s.trim();\n        };\n        const sedeNorm = normalizeSede(sede);\n        const destinatarios = [...(GERENTES_POR_SEDE[sedeNorm] || [])];";
content = content.replace(/const destinatarios = \[\.\.\.\(GERENTES_POR_SEDE\[sede\] \|\| \[\]\)\];/, hrNormalizer);

// 7. Mojibake
content = content.replace(/MedellÃ\xADn/g, "Medellín");
content = content.replace(/MÃ©xico/g, "México");

fs.writeFileSync('scripts/nodusHrSentinelAgent.mjs', content, 'utf8');
