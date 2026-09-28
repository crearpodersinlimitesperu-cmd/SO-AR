const fs = require('fs');
let content = fs.readFileSync('scripts/nodusDataScientistAgent.mjs', 'utf8');

// 1. imports
content = content.replace('import { initializeApp, getApps } from "firebase/app";\r\nimport { getFirestore, doc, setDoc, getDoc, collection, getDocs, writeBatch } from "firebase/firestore";\r\n', '');
content = content.replace('import { initializeApp, getApps } from "firebase/app";\nimport { getFirestore, doc, setDoc, getDoc, collection, getDocs, writeBatch } from "firebase/firestore";\n', '');

// 2. constructor
content = content.replace(/export class NodusDataScientistAgent \{[\s\S]*?this\.db = getFirestore\(app\);\s*\}/, 'export class NodusDataScientistAgent {\n  constructor(adminDb = null) {\n    this.db = adminDb;\n  }');

// 3. getDocs
content = content.replace(/const snapshot = await getDocs\(collection\(this\.db, 'managers'\)\);/g, "const snapshot = await this.db.collection('managers').get();");

// 4. writeBatch
content = content.replace(/const batch = writeBatch\(this\.db\);/g, "const batch = this.db.batch();");

// 5. docRef
content = content.replace(/const docRef = doc\(this\.db, 'managers', String\(m\.id\)\);/g, "const docRef = this.db.collection('managers').doc(String(m.id));");

// 6. commit
content = content.replace(/      \}\n    \}\n\n    \/\/ Guardar documento consolidado de reconciliaci/g, "      }\n    }\n\n    await batch.commit();\n    // Guardar documento consolidado de reconciliaci");
content = content.replace(/      \}\r\n    \}\r\n\r\n    \/\/ Guardar documento consolidado de reconciliaci/g, "      }\r\n    }\r\n\r\n    await batch.commit();\r\n    // Guardar documento consolidado de reconciliaci");

// 7. setDoc
content = content.replace(/await setDoc\(doc\(this\.db, 'nodus_managers_reconciliados', 'latest'\)/g, "await this.db.collection('nodus_managers_reconciliados').doc('latest').set(");
content = content.replace(/await setDoc\(doc\(this\.db, 'nodus_predictor_portfolio', 'latest'\)/g, "await this.db.collection('nodus_predictor_portfolio').doc('latest').set(");
content = content.replace(/await setDoc\(doc\(this\.db, 'nodus_prospectos_sin_pago', 'latest'\)/g, "await this.db.collection('nodus_prospectos_sin_pago').doc('latest').set(");

// 8. SEDES_FDS_PRICING
const pricingStr = "const SEDES_FDS_PRICING = {\n  'Lima': { moneda: 'PEN', simbolo: 'S/', precioFdsC1: 950, tasaUSD: 3.75 },\n  'Quito': { moneda: 'USD', simbolo: '$', precioFdsC1: 250, tasaUSD: 1.0 },\n  'Guayaquil': { moneda: 'USD', simbolo: '$', precioFdsC1: 250, tasaUSD: 1.0 },\n  'Cuenca': { moneda: 'USD', simbolo: '$', precioFdsC1: 250, tasaUSD: 1.0 },\n  'Medellín': { moneda: 'COP', simbolo: '$', precioFdsC1: 1000000, tasaUSD: 4000.0 },\n  'México': { moneda: 'MXN', simbolo: '$', precioFdsC1: 4500, tasaUSD: 17.0 }\n};\n\nexport function normalizeSedeName";
content = content.replace("export function normalizeSedeName", () => pricingStr);

// 9. Mojibake
content = content.replace(/MedellÃ\xADn/g, "Medellín");
content = content.replace(/MÃ©xico/g, "México");

// 10. Maestria Regex
content = content.replace(/\(Cuenca Ciclo 1\|GUAYAQUIL CICLO 1\|LIMA CICLO 1\|MEDELLIN\|QUITO CICLO 1\)/g, "(Cuenca Ciclo 1|GUAYAQUIL CICLO 1|LIMA CICLO 1|MEDELLIN|MEXICO|QUITO CICLO 1)");

fs.writeFileSync('scripts/nodusDataScientistAgent.mjs', content, 'utf8');
