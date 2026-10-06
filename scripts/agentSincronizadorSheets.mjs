import { google } from 'googleapis';
import { readFileSync, existsSync } from 'fs';

export class NodusManagersSheetAgent {
  constructor(adminDb) {
    this.db = adminDb;
    this.spreadsheetId = '1KF58QXAiIk4KP_9G2aiAM3ERVoptcqKlIraszNKq2Ow';
    const credentialsPath = 'centro-operativo-cpsl-3d05655c949c.json';
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const credentials = serviceAccountJson
      ? JSON.parse(serviceAccountJson)
      : existsSync(credentialsPath)
        ? JSON.parse(readFileSync(credentialsPath, 'utf8'))
        : null;
    if (!credentials) {
      throw new Error('Falta GOOGLE_SERVICE_ACCOUNT_JSON/FIREBASE_SERVICE_ACCOUNT_KEY para sincronizar Managers desde Google Sheets.');
    }
    this.auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
  }

  normalizeName(name) {
    return String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  normalizeSede(sede) {
    if (!sede) return 'Sede Global';
    const s = String(sede).trim();
    if (s === 'MED' || s.toLowerCase().includes('medell')) return 'Medellín';
    if (s === 'LIM' || s.toLowerCase().includes('lima')) return 'Lima';
    if (s === 'CUE' || s.toLowerCase().includes('cuenca')) return 'Cuenca';
    if (s === 'GYE' || s.toLowerCase().includes('guayaquil')) return 'Guayaquil';
    if (s.toLowerCase().includes('quito')) return 'Quito';
    if (s.toLowerCase().includes('mexico') || s.toLowerCase().includes('méxico') || s.toLowerCase().includes('cdmx')) return 'México';
    return s;
  }

  async syncManagersFromSheet() {
    console.log("🕵️‍♂️ [Managers Sheet Agent] Iniciando extracción de Managers desde Google Sheets...");
    const sheets = google.sheets({ version: 'v4', auth: this.auth });
    let rows = [];
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'A:L',
      });
      rows = response.data.values;
    } catch (e) {
      console.error("❌ Error leyendo Google Sheets:", e.message);
      return;
    }

    if (!rows || rows.length < 2) {
      console.log("No hay datos suficientes en el Sheet.");
      return;
    }

    const header = rows[0].map(h => String(h || '').trim().toLowerCase());
    const idx = {
      nombre: header.findIndex(h => h.startsWith('nombre y apellido')),
      rol: header.findIndex(h => h === 'rol'),
      telefono: header.findIndex(h => h.includes('teléfono') || h.includes('telefono')),
      numEquipo: header.findIndex(h => h.includes('número de equipo') || h.includes('numero de equipo')),
      equipo: header.findIndex(h => h.includes('nombre de equipo')),
      entrenador: header.findIndex(h => h === 'entrenador'),
      coordinador: header.findIndex(h => h.startsWith('coordinador mj')),
      sede: header.findIndex(h => h === 'sede'),
      graduado: header.findIndex(h => h === 'graduado'),
      desertor: header.findIndex(h => h === 'desertor'),
    };

    // Obtener todos los managers actuales de Firestore
    const currentSnapshot = await this.db.collection('managers').get();
    const currentManagers = [];
    currentSnapshot.forEach(doc => {
      currentManagers.push({ id: doc.id, ...doc.data() });
    });

    const batch = this.db.batch();
    let adds = 0;
    let updates = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[idx.nombre]) continue; // Sin nombre no hay manager

      const nombreOriginal = String(row[idx.nombre]).trim();
      const normName = this.normalizeName(nombreOriginal);
      if (!normName) continue;

      let estado = 'Activo';
      const desertor = String(row[idx.desertor] || '').trim().toUpperCase();
      const graduado = String(row[idx.graduado] || '').trim().toUpperCase();
      if (desertor === 'DESERTOR') estado = 'Desertor';
      if (graduado === 'GRADUADO') estado = 'Graduado';

      const numEqSheet = parseInt(String(row[idx.numEquipo] || '').trim()) || null;

      const sheetData = {
        nombre: nombreOriginal,
        rol: String(row[idx.rol] || '').trim() || 'MANAGER',
        telefono: String(row[idx.telefono] || '').trim(),
        numEquipo: numEqSheet,
        equipo: String(row[idx.equipo] || '').trim(),
        entrenador: String(row[idx.entrenador] || '').trim(),
        coordinador: String(row[idx.coordinador] || '').trim(),
        sede: this.normalizeSede(row[idx.sede]),
        estado: estado,
        lastSheetSync: new Date().toISOString()
      };

      // Buscar si existe (normalizado) - REGLA: Mismo nombre PERO mismo equipo. Diferente equipo = Duplicado permitido
      const existing = currentManagers.find(m => this.normalizeName(m.nombre) === normName && String(m.numEquipo) === String(numEqSheet));

      if (!existing) {
        // ES NUEVO, AGREGAR A CAUSA
        const newRef = this.db.collection('managers').doc();
        batch.set(newRef, sheetData);
        adds++;
        console.log(`[+] Nuevo Manager detectado en Sheet: ${sheetData.nombre} (Eq: ${sheetData.numEquipo}, Sede: ${sheetData.sede})`);
      } else {
        // EXISTE, ACTUALIZAR SI HAY CAMBIOS CLAVES
        let needsUpdate = false;
        const updateObj = { lastSheetSync: sheetData.lastSheetSync };
        
        // REGLA TRAZABILIDAD: Causa es el master de Estado. Si hay discrepancia, no sobreescribir ciegamente.
        if (existing.estado !== sheetData.estado) {
          updateObj.estado_en_sheet = sheetData.estado;
          updateObj.discrepancia_estado = true;
          needsUpdate = true;
          console.log(`[*] Discrepancia de estado para ${sheetData.nombre} (Eq: ${sheetData.numEquipo}). Causa: ${existing.estado}, Sheet: ${sheetData.estado}`);
        } else {
            // Si son iguales pero antes habia discrepancia, la limpiamos
            if (existing.discrepancia_estado) {
                updateObj.discrepancia_estado = false;
                updateObj.estado_en_sheet = null; // Eliminamos la nota de discrepancia
                needsUpdate = true;
            }
        }
        
        if (!existing.telefono && sheetData.telefono) {
          updateObj.telefono = sheetData.telefono;
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          const ref = this.db.collection('managers').doc(existing.id);
          batch.update(ref, updateObj);
          updates++;
        }
      }
    }

    if (adds > 0 || updates > 0) {
      await batch.commit();
      console.log(`✅ [Managers Sheet Agent] Sincronización completada: ${adds} nuevos agregados, ${updates} actualizados.`);
    } else {
      console.log(`⚡ [Managers Sheet Agent] Sincronización completada: No hubo cambios ni managers nuevos.`);
    }
  }
}
