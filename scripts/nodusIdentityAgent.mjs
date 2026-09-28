/**
 * =========================================================================
 * AGENTE 8: MAESTRO DE IDENTIDAD Y VERACIDAD (NodusIdentityAgent)
 * =========================================================================
 * 
 * Rol: Custodio de la verdad de Talento Humano.
 * Función:
 * 1. Descarga en tiempo real la sábana maestra de RRHH desde Google Sheets.
 * 2. Contrasta los usuarios extraídos de Nodus contra la lista oficial.
 * 3. Purga automáticamente a cualquier usuario inventado, falso, o que haya RENUNCIADO.
 * 4. Corrige nombres mal escritos en Nodus utilizando el "Nombre y Apellido Preferido".
 */

export class NodusIdentityAgent {
  constructor() {
    this.sheetUrl = 'https://docs.google.com/spreadsheets/d/1bl1_R6Qiee4tQ31Oix1Mjo_Jsbmddv3nsc5xBIy7QJY/export?format=csv&gid=0';
  }

  async fetchMasterRoster() {
    console.log("🛡️ [Agente 8 - Identidad] Consultando sábana maestra de RRHH en Google Sheets...");
    try {
      const response = await fetch(this.sheetUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const csv = await response.text();
      return this.parseCSV(csv);
    } catch (err) {
      console.error("❌ [Agente 8] Error obteniendo sábana maestra:", err.message);
      return []; // Failsafe
    }
  }

  parseCSV(csv) {
    const lines = csv.split('\n').filter(l => l.trim() !== '');
    if (lines.length === 0) return [];

    // Parse header to find column indices
    const headers = lines[0].split(',').map(h => h.trim());
    const idxNombre = headers.indexOf('Nombre');
    const idxPreferido = headers.indexOf('Nombre y Apellido Preferido');
    const idxStatus = headers.indexOf('STATUS');

    const roster = [];
    for (let i = 1; i < lines.length; i++) {
      // Simplistic CSV parse (handles commas inside quotes if needed, though basic split is fine for our specific sheet mostly)
      // A better regex for CSV splitting:
      const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      if (row.length <= idxNombre) continue;

      const fullNombre = row[idxNombre] ? row[idxNombre].replace(/"/g, '').trim() : '';
      const preferido = idxPreferido !== -1 && row[idxPreferido] ? row[idxPreferido].replace(/"/g, '').trim() : fullNombre;
      const status = idxStatus !== -1 && row[idxStatus] ? row[idxStatus].replace(/"/g, '').trim().toUpperCase() : '';

      if (fullNombre) {
        roster.push({
          fullNombre,
          preferido,
          status,
          renuncio: status.includes('RENUNCIO') || status.includes('BAJA')
        });
      }
    }
    return roster;
  }

  normalizeString(str) {
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  }

  /**
   * Pasa un escáner de identidad a los coordinadores extraídos de Nodus,
   * eliminando inventados/renunciados y corrigiendo nombres oficiales.
   */
  async enforceIdentityTruth(coordinadores) {
    const roster = await this.fetchMasterRoster();
    if (roster.length === 0) {
      console.warn("⚠️ [Agente 8] Sábana maestra vacía o inaccesible, se omite el filtrado estricto por seguridad.");
      return coordinadores; // Si falla la sábana, no rompemos el proceso, pero advertimos
    }

    console.log(`🛡️ [Agente 8 - Identidad] Sábana cargada con ${roster.length} perfiles oficiales.`);
    const coordinadoresVerificados = [];
    let depurados = 0;
    let corregidos = 0;

    for (const c of coordinadores) {
      const nodusNameNorm = this.normalizeString(c.nombre || '');
      
      // Buscar coincidencia en el roster oficial
      let match = null;

      for (const r of roster) {
        const fullNorm = this.normalizeString(r.fullNombre);
        const prefNorm = this.normalizeString(r.preferido);

        // Lógica de coincidencia: si el nombre de Nodus está contenido en el nombre oficial completo o viceversa
        if (fullNorm.includes(nodusNameNorm) || nodusNameNorm.includes(fullNorm) ||
            prefNorm.includes(nodusNameNorm) || nodusNameNorm.includes(prefNorm)) {
          match = r;
          break;
        }

        // Match parcial por primer nombre y primer apellido
        const nodusParts = nodusNameNorm.split(' ');
        if (nodusParts.length >= 2) {
          if (fullNorm.includes(nodusParts[0]) && fullNorm.includes(nodusParts[1])) {
            match = r;
            break;
          }
        }
      }

      if (!match) {
        console.log(`   🚫 [Alucinación/Inventado Detectado] Eliminando coordinador Nodus no reconocido: "${c.nombre}"`);
        depurados++;
        continue;
      }

      if (match.renuncio) {
        console.log(`   🛑 [Ex-Colaborador Detectado] Eliminando registro de Nodus para: "${match.preferido}" (RENUNCIÓ)`);
        depurados++;
        continue;
      }

      // Si existe y no renunció, corregir su nombre al PREFERIDO OFICIAL
      if (c.nombre !== match.preferido) {
        // console.log(`   ✨ [Identidad Corregida] "${c.nombre}" -> Oficial: "${match.preferido}"`);
        c.nombreOriginalNodus = c.nombre;
        c.nombre = match.preferido;
        corregidos++;
      }

      coordinadoresVerificados.push(c);
    }

    console.log(`✅ [Agente 8 - Identidad] Auditoría de Veracidad Completa.`);
    console.log(`   - 🛡️ Coordinadores Reales Confirmados: ${coordinadoresVerificados.length}`);
    console.log(`   - 🗑️ Registros falsos/ex-empleados eliminados: ${depurados}`);
    console.log(`   - ✨ Nombres normalizados a formato oficial: ${corregidos}`);

    return coordinadoresVerificados;
  }
}
