import { FieldValue } from 'firebase-admin/firestore';

export class NodusGenealogyAgent {
  constructor(adminDb = null, options = {}) {
    this.db = adminDb;
    this.dryRun = options.dryRun || false;
  }

  /**
   * Genera el árbol genealógico (quién enroló a quién) cruzando los participantes con sus IMO.
   * Y realiza validaciones de coherencia histórica (Ej: C2 sin C1).
   */
  async runCoherenceAndLineage(normalizedData, prospectosData = [], fdsData = [], maestriaTeams = []) {
    console.log("🧬 [Agente 7 - Genealogista] Construyendo árbol de linaje global y verificando coherencia...");
    
    const equiposReporte = normalizedData.equiposReporte || [];
    
    // 1. Extraer a todos los participantes posibles (C1/C2) en una tabla hash (Diccionario)
    const participantesMap = new Map();
    const enrolamientosPorIMO = new Map();
    const anomalias = [];
    
    // Poblar diccionario
    for (const equipo of equiposReporte) {
      if (!equipo.participantes) continue;
      
      for (const p of equipo.participantes) {
        // Nodus no expone un ID único de participante siempre, unimos Nombres y Apellidos como clave primaria temporal (normalizada)
        const fullName = `${p.nombres || ''} ${p.apellidos || ''}`.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (!fullName) continue;

        const imoClean = (p.imo || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        if (!participantesMap.has(fullName)) {
          participantesMap.set(fullName, {
            nombreCompleto: `${p.nombres || ''} ${p.apellidos || ''}`.trim(),
            telefono: p.telefono || '',
            imo: p.imo || 'SIN IMO',
            imoNormalizado: imoClean,
            sede: normalizedData.coordinadores.find(c => c.nombre.includes(p.coordinador))?.sede || 'Desconocida',
            equipo: equipo.equipoNombre || '',
            asistencia: p.asistencia || 'No',
            cicloActual: equipo.equipoNombre.toUpperCase().includes('C2') ? 'C2' : 'C1',
            descendientes: []
          });
        }
      }
    }

    // 2. Construir árbol de enrolamientos e identificar Anomalías de Linaje
    console.log(`🔍 [Agente 7 - Genealogista] Mapeando descendencia de ${participantesMap.size} participantes únicos...`);
    
    for (const [key, p] of participantesMap.entries()) {
      const sponsorKey = p.imoNormalizado;
      
      if (sponsorKey && sponsorKey !== 'sin imo') {
        // ¿Existe el IMO en la base de datos de Nodus actual o histórica?
        if (participantesMap.has(sponsorKey)) {
          const sponsor = participantesMap.get(sponsorKey);
          sponsor.descendientes.push(p.nombreCompleto);
        } else {
          // El IMO no es parte de la cohorte actual (podría ser de una cohorte vieja)
          if (!enrolamientosPorIMO.has(sponsorKey)) {
            enrolamientosPorIMO.set(sponsorKey, []);
          }
          enrolamientosPorIMO.get(sponsorKey).push(p.nombreCompleto);
        }
      }

      // 3. Auditoría de Coherencia de Datos
      // - Anomalía 1: Está en C2 pero "Asistencia" dice "No" en su historial o no hay registro de C1
      // (Esta regla es aproximada ya que C1 y C2 pueden estar en la misma base, se afinará con el historial de Firestore)
      if (p.cicloActual === 'C2' && p.asistencia.toLowerCase().includes('no')) {
         anomalias.push({
           participante: p.nombreCompleto,
           sede: p.sede,
           tipo: 'INCOHERENCIA_ASISTENCIA',
           descripcion: `Participante está en equipo de C2 pero su estado de asistencia general indica que no asistió.`
         });
      }
    }

    // 4. Identificar a los Top Enroladores Globales (Top Patrocinadores)
    const rankingEnroladores = [];
    for (const [key, p] of participantesMap.entries()) {
      if (p.descendientes.length > 0) {
        rankingEnroladores.push({
          nombre: p.nombreCompleto,
          sede: p.sede,
          enrolados_directos: p.descendientes.length
        });
      }
    }
    
    // Sumar a los IMOs que no son participantes actuales (ej. graduados de Maestría)
    for (const [imoName, enrolados] of enrolamientosPorIMO.entries()) {
      rankingEnroladores.push({
        nombre: imoName.toUpperCase(),
        sede: 'Histórico / Maestría',
        enrolados_directos: enrolados.length
      });
    }

    // Ordenar de mayor a menor descendencia
    rankingEnroladores.sort((a, b) => b.enrolados_directos - a.enrolados_directos);

    const reporteLinaje = {
      timestamp: new Date().toISOString(),
      universoParticipantes: participantesMap.size,
      topEnroladores: rankingEnroladores.slice(0, 50), // Top 50 Global
      anomaliasDetectadas: anomalias,
      resumenAnomalias: {
        total: anomalias.length
      }
    };

    console.log(`✅ [Agente 7 - Genealogista] Árbol de linaje completado. Identificados ${rankingEnroladores.length} IMOs/Líderes activos. Detectadas ${anomalias.length} anomalías.`);

    return reporteLinaje;
  }

  async publicarLinajeYCoherencia(reporte) {
    if (this.dryRun) {
      console.log("🧪 [Agente 7 - Genealogista] MODO DRY-RUN: No se escribirá en Firestore.");
      return;
    }

    if (!this.db) {
       console.warn("⚠️ [Agente 7] adminDb no provisto. Se omite escritura.");
       return;
    }

    console.log("🚀 [Agente 7 - Genealogista] Publicando Árbol de Linaje en /nodus_linaje_global/latest...");
    try {
      await this.db.collection('nodus_linaje_global').doc('latest').set({
        ...reporte,
        updatedAt: FieldValue.serverTimestamp()
      });
      console.log("✅ [Agente 7 - Genealogista] Guardado exitoso.");
    } catch (err) {
      console.error(`❌ [Agente 7] Error al publicar: ${err.message}`);
    }
  }
}
