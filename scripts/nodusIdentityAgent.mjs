/**
 * =========================================================================
 * AGENTE 8: MAESTRO DE IDENTIDAD Y VERACIDAD (NodusIdentityAgent)
 * =========================================================================
 * 
 * Rol: Custodio de la verdad de Talento Humano.
 * Función:
 * 1. Descarga en tiempo real la sábana maestra de RRHH desde Google Sheets.
 * 2. Contrasta los usuarios extraídos de Nodus contra la lista oficial.
 * 3. Elimina registros con baja confirmada y conserva sin vincular los nombres no verificables.
 * 4. Corrige nombres de Nodus solo tras una coincidencia exacta en la sábana maestra.
 * 5. Verifica el Cargo de manera estricta para no cruzar C1/C2 con Maestría del Juego.
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
    // IMPORTANT: Find by partial match to avoid accent issues
    const idxCargo = headers.findIndex(h => h.includes('Cargo'));

    const roster = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      if (row.length <= idxNombre) continue;

      const fullNombre = row[idxNombre] ? row[idxNombre].replace(/"/g, '').trim() : '';
      const preferido = idxPreferido !== -1 && row[idxPreferido] ? row[idxPreferido].replace(/"/g, '').trim() : fullNombre;
      const status = idxStatus !== -1 && row[idxStatus] ? row[idxStatus].replace(/"/g, '').trim().toUpperCase() : '';
      const normalizedStatus = status.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const cargo = idxCargo !== -1 && row[idxCargo] ? row[idxCargo].replace(/"/g, '').trim() : '';

      if (fullNombre) {
        roster.push({
          fullNombre,
          preferido,
          status,
          cargo,
          renuncio: normalizedStatus.includes('RENUNCIO') || normalizedStatus.includes('BAJA')
        });
      }
    }
    return roster;
  }

  normalizeString(str) {
    return String(str || '')
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  }

  /**
   * Pasa un escáner de identidad a los coordinadores extraídos de Nodus,
   * elimina bajas confirmadas y corrige nombres solo con una coincidencia exacta.
   * Los casos ausentes o ambiguos se conservan como no verificados.
   * Si se provee tipoCargo ('C1_C2' o 'CMJ'), filtra estrictamente que el cargo en la sábana coincida.
   */
  async enforceIdentityTruth(coordinadores, tipoCargo = null) {
    const roster = await this.fetchMasterRoster();
    if (roster.length === 0) {
      console.warn("⚠️ [Agente 8] Sábana maestra vacía o inaccesible; se conservan los registros sin verificarlos.");
      return coordinadores.map(c => ({
        ...c,
        identityVerified: false,
        identityStatus: 'ROSTER_UNAVAILABLE'
      }));
    }

    console.log(`🛡️ [Agente 8 - Identidad] Sábana cargada con ${roster.length} perfiles oficiales.`);
    const coordinadoresConIdentidad = [];
    let depurados = 0;
    let corregidos = 0;

    for (const c of coordinadores) {
      const nodusNameNorm = this.normalizeString(c.nombre);
      const matches = roster.filter(r =>
        [r.fullNombre, r.preferido].some(name => this.normalizeString(name) === nodusNameNorm)
      );

      if (matches.length !== 1) {
        c.identityVerified = false;
        c.identityStatus = matches.length === 0 ? 'NO_UNIQUE_ROSTER_MATCH' : 'AMBIGUOUS_ROSTER_MATCH';
        coordinadoresConIdentidad.push(c);
        console.warn(`   ⚠️ [Agente 8] Identidad no vinculada; se conserva sin asociar a otra persona: "${c.nombre}"`);
        continue;
      }
      const match = matches[0];

      if (match.renuncio) {
        console.log(`   🚨 [Ex-Colaborador Detectado] Eliminando registro de Nodus para: "${match.preferido}" (RENUNCIÓ)`);
        depurados++;
        continue;
      }

      if (tipoCargo === 'C1_C2') {
         const cargoOficialNorm = this.normalizeString(match.cargo || '');
         if (!cargoOficialNorm.includes('capitulo uno y dos') && !cargoOficialNorm.includes('capitulo 1 y 2')) {
           console.log(`   ❌ [Cruce de Campaña] Excluyendo a "${match.preferido}". Cargo oficial: "${match.cargo}" (NO es CC1/CC2).`);
           depurados++;
           continue;
         }
      } else if (tipoCargo === 'CMJ') {
         const cargoOficialNorm = this.normalizeString(match.cargo || '');
         if (!cargoOficialNorm.includes('maestria del juego')) {
           console.log(`   ❌ [Cruce de Campaña] Excluyendo a "${match.preferido}". Cargo oficial: "${match.cargo}" (NO es CMJ).`);
           depurados++;
           continue;
         }
      }

      if (c.nombre !== match.preferido) {
        c.nombreOriginalNodus = c.nombre;
        c.nombre = match.preferido;
        corregidos++;
      }

      c.identityVerified = true;
      c.identityStatus = 'VERIFIED';
      coordinadoresConIdentidad.push(c);
    }

    console.log(`✨ [Agente 8 - Identidad] Auditoría de Veracidad Completa.`);
    console.log(`   - 🛡️ Identidades verificadas: ${coordinadoresConIdentidad.filter(c => c.identityVerified).length}`);
    console.log(`   - ⚠️ Registros sin vinculación única conservados: ${coordinadoresConIdentidad.filter(c => !c.identityVerified).length}`);
    console.log(`   - 🗑️ Registros con baja/cargo incompatible eliminados: ${depurados}`);
    console.log(`   - ✨ Nombres normalizados a formato oficial: ${corregidos}`);

    return coordinadoresConIdentidad;
  }
}
