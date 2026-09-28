 = [System.IO.File]::ReadAllText('C:\Users\josem\Documents\SO-AR\scripts\nodusDataScientistAgent.mjs', [System.Text.Encoding]::UTF8)

# 1. imports
 = .Replace("import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, writeBatch } from "firebase/firestore";", "")

# 2. constructor
 =  -replace "(?s)export class NodusDataScientistAgent \{.*?this\.db = getFirestore\(app\);\s*\}", "export class NodusDataScientistAgent {
  constructor(adminDb = null) {
    this.db = adminDb;
  }"

# 3. getDocs
 = .Replace("const snapshot = await getDocs(collection(this.db, 'managers'));", "const snapshot = await this.db.collection('managers').get();")

# 4. writeBatch
 = .Replace("const batch = writeBatch(this.db);", "const batch = this.db.batch();")

# 5. docRef
 = .Replace("const docRef = doc(this.db, 'managers', String(m.id));", "const docRef = this.db.collection('managers').doc(String(m.id));")

# 6. commit
 = .Replace("      }
    }

    // Guardar documento consolidado de reconciliaci", "      }
    }

    await batch.commit();
    // Guardar documento consolidado de reconciliaci")

# 7. setDoc
 = .Replace("await setDoc(doc(this.db, 'nodus_managers_reconciliados', 'latest')", "await this.db.collection('nodus_managers_reconciliados').doc('latest').set(")
 = .Replace("await setDoc(doc(this.db, 'nodus_predictor_portfolio', 'latest')", "await this.db.collection('nodus_predictor_portfolio').doc('latest').set(")
 = .Replace("await setDoc(doc(this.db, 'nodus_prospectos_sin_pago', 'latest')", "await this.db.collection('nodus_prospectos_sin_pago').doc('latest').set(")

# 8. SEDES_FDS_PRICING
 = "const SEDES_FDS_PRICING = {
  'Lima': { moneda: 'PEN', simbolo: 'S/', precioFdsC1: 950, tasaUSD: 3.75 },
  'Quito': { moneda: 'USD', simbolo: '$', precioFdsC1: 250, tasaUSD: 1.0 },
  'Guayaquil': { moneda: 'USD', simbolo: '$', precioFdsC1: 250, tasaUSD: 1.0 },
  'Cuenca': { moneda: 'USD', simbolo: '$', precioFdsC1: 250, tasaUSD: 1.0 },
  'Medellín': { moneda: 'COP', simbolo: '$', precioFdsC1: 1000000, tasaUSD: 4000.0 },
  'México': { moneda: 'MXN', simbolo: '$', precioFdsC1: 4500, tasaUSD: 17.0 }
};

export function normalizeSedeName"
 = .Replace("export function normalizeSedeName", )

# 9. Mojibake
 = .Replace("MedellÃ­n", "Medellín")
 = .Replace("MÃ©xico", "México")

# 10. Maestria Regex
 = .Replace("(Cuenca Ciclo 1|GUAYAQUIL CICLO 1|LIMA CICLO 1|MEDELLIN|QUITO CICLO 1)", "(Cuenca Ciclo 1|GUAYAQUIL CICLO 1|LIMA CICLO 1|MEDELLIN|MEXICO|QUITO CICLO 1)")

[System.IO.File]::WriteAllText('C:\Users\josem\Documents\SO-AR\scripts\nodusDataScientistAgent.mjs', , [System.Text.Encoding]::UTF8)
