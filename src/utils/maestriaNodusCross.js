import { getLimaMaestriaCheckinInfo } from './maestriaLimaCheckin.js';

const ACTIVE_MAESTRIA_FDS = new Set(['PFD', 'SFD', 'TFD']);

export function normalizeNodusText(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeNodusDoc(str) {
  if (!str) return '';
  return String(str)
    .replace(/^(dni|ce|pasaporte|doc)[:\s-]*/i, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .trim();
}

export function normalizeNodusEmail(str) {
  if (!str) return '';
  return String(str).trim().toLowerCase();
}

export function normalizeNodusPhone(str) {
  if (!str) return '';
  const digits = String(str).replace(/\D/g, '');
  if (digits.length < 8) return '';
  return digits.slice(-9);
}

export function extractTeamNumber(teamLabel) {
  const m = String(teamLabel || '').match(/\b(\d{2,3})\b/);
  return m ? m[1] : null;
}

export function selectActiveLimaMaestriaTeams(nodusEquipos = []) {
  return (Array.isArray(nodusEquipos) ? nodusEquipos : [])
    .filter((eq) => {
      const sede = String(eq?.sede || '').toUpperCase();
      const isLima = eq?.id_sede === 7 || sede.includes('LIMA');
      const fds = String(eq?.etapa_vigente || '').toUpperCase().trim();
      return isLima && eq?.en_actividad !== false && ACTIVE_MAESTRIA_FDS.has(fds);
    })
    .sort((a, b) => Number(extractTeamNumber(a.nombre) || a.id) - Number(extractTeamNumber(b.nombre) || b.id));
}

function formatRoleLabel(tipoPersona) {
  const raw = String(tipoPersona || '').toLowerCase().trim();
  if (raw === 'manager') return 'Manager';
  if (raw === 'capitan') return 'Capitán';
  if (raw === 'bono') return 'Bono';
  if (raw === 'participante') return 'Participante';
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : 'Participante';
}

function findContractForNodusPerson(person, signedContracts) {
  const personDoc = normalizeNodusDoc(person.identificacion);
  const personEmail = normalizeNodusEmail(person.email);
  const personPhone = normalizeNodusPhone(person.telefono);
  const personFull = normalizeNodusText(`${person.nombres || ''} ${person.apellidos || ''}`);
  const personPref = normalizeNodusText(person.nombre_preferido || '');
  const personTokens = personFull.split(' ').filter((t) => t.length > 2);

  if (personDoc.length >= 5) {
    const byDoc = signedContracts.find((c) => normalizeNodusDoc(c.numeroDocumento || c.doc) === personDoc);
    if (byDoc) return { contract: byDoc, matchBy: 'DNI' };
  }

  if (personEmail.includes('@')) {
    const byEmail = signedContracts.find((c) => normalizeNodusEmail(c.email) === personEmail);
    if (byEmail) return { contract: byEmail, matchBy: 'EMAIL' };
  }

  if (personPhone) {
    const byPhone = signedContracts.find((c) => normalizeNodusPhone(c.telefono || c.celular) === personPhone);
    if (byPhone) return { contract: byPhone, matchBy: 'TELEFONO' };
  }

  const byName = signedContracts.find((c) => {
    const sigName = normalizeNodusText(c.nombre || c.nombreCompleto || '');
    if (!sigName) return false;
    if (personFull && sigName === personFull) return true;
    if (personPref && personPref.length > 5 && sigName === personPref) return true;
    if (personTokens.length >= 2) {
      const matchedTokens = personTokens.filter((t) => sigName.includes(t));
      return matchedTokens.length >= Math.min(3, personTokens.length);
    }
    return false;
  });

  return byName ? { contract: byName, matchBy: 'NOMBRE' } : null;
}

export function evaluatePriorCoherence(entry) {
  if (!entry) return { status: 'UNKNOWN', isCoherent: false, issues: ['Sin datos Nodus'] };
  if (entry.tipoPersona === 'manager') {
    return { status: 'MANAGER', isCoherent: true, label: 'Manager · Staff', issues: [] };
  }
  const etapas = Array.isArray(entry.etapas) ? entry.etapas : [];
  const c1Etapa = etapas.find((e) => /^(C1|CAP\s*1|CAPITULO\s*1)$/i.test(String(e?.etapa || '').trim()));
  const c2Etapa = etapas.find((e) => /^(C2|CAP\s*2|CAPITULO\s*2)$/i.test(String(e?.etapa || '').trim()));

  const hasC1Asistencia = Boolean(entry.asistioC1 || c1Etapa?.asistio);
  const hasC1Pago = Boolean(entry.pagadoC1 || c1Etapa?.pagado);
  const hasC2Pago = Boolean(entry.pagadoC2 || c2Etapa?.pagado || c2Etapa?.asistio || entry.asistioC2);
  const isDesertor = Boolean(entry.desertorC1 || c1Etapa?.desertor || c2Etapa?.desertor);

  const issues = [];
  if (isDesertor) issues.push('Desertor en entrenamiento previo');
  if (!hasC1Asistencia) issues.push('Sin asistencia C1');
  if (!hasC1Pago && !hasC1Asistencia) issues.push('Sin pago C1');
  if (!hasC2Pago) issues.push('Sin pago/asistencia C2');

  return {
    status: issues.length === 0 ? 'OK' : 'OBS',
    isCoherent: issues.length === 0,
    hasC1Asistencia,
    hasC1Pago,
    hasC2Pago,
    isDesertor,
    issues
  };
}

export function buildMaestriaNodusCross({
  signedContracts = [],
  nodusEquipos = [],
  nodusRosterByTeam = {},
  nodusByDni = {}
} = {}) {
  const activeTeams = selectActiveLimaMaestriaTeams(nodusEquipos);

  // Indexar todas las personas de Nodus de los equipos activos de Maestría Lima
  const allNodusEntries = [];
  const byDoc = new Map();
  const byEmail = new Map();
  const byPhone = new Map();
  const byName = new Map();

  for (const eq of activeTeams) {
    const roster = Array.isArray(nodusRosterByTeam[eq.id]) ? nodusRosterByTeam[eq.id] : [];
    const fdsVigente = String(eq.etapa_vigente || '').toUpperCase().trim();
    const checkinInfo = getLimaMaestriaCheckinInfo(eq.nombre);

    for (const p of roster) {
      const fullName = `${p.nombres || ''} ${p.apellidos || ''}`.replace(/\s+/g, ' ').trim() || p.nombre_preferido || 'Sin nombre';
      const docNorm = normalizeNodusDoc(p.identificacion);
      const emailNorm = normalizeNodusEmail(p.email);
      const nameNorm = normalizeNodusText(fullName);
      const maestriaNodus = Boolean(p.capitulo2?.maestria);
      const pagadoC1 = Boolean(p.capitulo1?.pagado);
      const pagadoC2 = Boolean(p.capitulo2?.pagado);
      const asistioC1 = Boolean(p.capitulo1?.asistio);
      const asistioC2 = Boolean(p.capitulo2?.asistio);
      const desertorC1 = Boolean(p.capitulo1?.desertor);

      const entry = {
        nodusId: p.id,
        identificacion: p.identificacion || '',
        docNorm,
        nombre: fullName,
        nombrePreferido: p.nombre_preferido || '',
        email: p.email || '',
        emailNorm,
        telefono: p.telefono || '',
        tipoPersona: p.tipo_persona || 'participante',
        rolLabel: formatRoleLabel(p.tipo_persona),
        coordinador: p.coordinador || '',
        equipoId: eq.id,
        equipoNombre: eq.nombre || `Equipo ${extractTeamNumber(eq.nombre) || eq.id}`,
        equipoNum: extractTeamNumber(eq.nombre),
        sede: eq.sede || 'LIMA CICLO 1',
        fdsVigente,
        asistioC1,
        pagadoC1,
        desertorC1,
        pagadoC2,
        asistioC2,
        maestriaNodus,
        checkinUrl: checkinInfo?.url || null,
        etapas: [],
        nodusRecord: p,
        exhaustiveLookup: false
      };

      allNodusEntries.push(entry);
      if (docNorm.length >= 5 && !byDoc.has(docNorm)) byDoc.set(docNorm, entry);
      if (emailNorm.includes('@') && !byEmail.has(emailNorm)) byEmail.set(emailNorm, entry);
      const phoneNorm = normalizeNodusPhone(p.telefono);
      if (phoneNorm && !byPhone.has(phoneNorm)) byPhone.set(phoneNorm, entry);
      if (nameNorm && !byName.has(nameNorm)) byName.set(nameNorm, entry);
    }
  }

  // 0.5 Fusionar resultados de búsqueda exhaustiva por DNI (/api/participante?identificacion=...)
  for (const [rawKey, p] of Object.entries(nodusByDni || {})) {
    if (!p || typeof p !== 'object') continue;
    const docNorm = normalizeNodusDoc(p.identificacion || rawKey);
    if (docNorm.length < 5) continue;

    const etapas = Array.isArray(p.etapas) ? p.etapas : [];
    const equipoObj = p.equipo_actual && typeof p.equipo_actual === 'object' ? p.equipo_actual : null;
    const matchedActiveTeam =
      activeTeams.find((eq) => {
        if (equipoObj?.id && Number(eq.id) === Number(equipoObj.id)) return true;
        const eqNum = extractTeamNumber(eq.nombre);
        const pNum = extractTeamNumber(equipoObj?.nombre);
        if (eqNum && pNum && eqNum === pNum) return true;
        return etapas.some(
          (e) =>
            extractTeamNumber(e?.equipo) === eqNum &&
            String(e?.etapa || '').toUpperCase().trim() === String(eq.etapa_vigente || '').toUpperCase().trim()
        );
      }) || null;

    const activeFdsEtapa = matchedActiveTeam
      ? etapas.find(
          (e) =>
            String(e?.etapa || '').toUpperCase().trim() === String(matchedActiveTeam.etapa_vigente || '').toUpperCase().trim() &&
            (!extractTeamNumber(e?.equipo) || extractTeamNumber(e?.equipo) === extractTeamNumber(matchedActiveTeam.nombre))
        )
      : null;

    const anyMaestriaAsistio = etapas.some(
      (e) => ACTIVE_MAESTRIA_FDS.has(String(e?.etapa || '').toUpperCase().trim()) && Boolean(e?.asistio) && !e?.desertor
    );
    const hasExactEtapasForActiveTeam = Boolean(matchedActiveTeam && etapas.length > 0);
    const maestriaFlag = hasExactEtapasForActiveTeam
      ? Boolean(activeFdsEtapa && activeFdsEtapa.asistio && !activeFdsEtapa.desertor)
      : Boolean(p.maestria || p.capitulo2?.maestria || anyMaestriaAsistio);

    const existing = byDoc.get(docNorm);
    if (existing) {
      existing.etapas = etapas.length > 0 ? etapas : existing.etapas;
      existing.nodusRecord = p;
      existing.exhaustiveLookup = true;
      existing.maestriaNodus = hasExactEtapasForActiveTeam ? maestriaFlag : (existing.maestriaNodus || maestriaFlag);
      continue;
    }

    const fullName = `${p.nombres || ''} ${p.apellidos || ''}`.replace(/\s+/g, ' ').trim() || p.nombre_preferido || 'Sin nombre';
    const emailNorm = normalizeNodusEmail(p.email);
    const nameNorm = normalizeNodusText(fullName);
    const resolvedTeamName = matchedActiveTeam?.nombre || equipoObj?.nombre || (etapas[etapas.length - 1]?.equipo) || 'Nodus';
    const resolvedFds = matchedActiveTeam?.etapa_vigente || (etapas[etapas.length - 1]?.etapa) || 'MAESTRIA';
    const checkinInfo = getLimaMaestriaCheckinInfo(resolvedTeamName);

    const entry = {
      nodusId: p.id || null,
      identificacion: p.identificacion || rawKey,
      docNorm,
      nombre: fullName,
      nombrePreferido: p.nombre_preferido || '',
      email: p.email || '',
      emailNorm,
      telefono: p.telefono || '',
      tipoPersona: p.tipo_persona || 'participante',
      rolLabel: formatRoleLabel(p.tipo_persona),
      coordinador: p.coordinador || '',
      equipoId: matchedActiveTeam?.id || equipoObj?.id || null,
      equipoNombre: resolvedTeamName,
      equipoNum: extractTeamNumber(resolvedTeamName),
      sede: p.sede?.nombre || matchedActiveTeam?.sede || 'LIMA CICLO 1',
      fdsVigente: String(resolvedFds).toUpperCase().trim(),
      asistioC1: typeof p.capitulo1 === 'boolean' ? p.capitulo1 : Boolean(p.capitulo1?.asistio),
      pagadoC1: Boolean(p.capitulo1?.pagado),
      desertorC1: Boolean(p.capitulo1?.desertor),
      pagadoC2: typeof p.capitulo2 === 'boolean' ? p.capitulo2 : Boolean(p.capitulo2?.pagado),
      asistioC2: Boolean(p.capitulo2?.asistio),
      maestriaNodus: maestriaFlag,
      checkinUrl: checkinInfo?.url || null,
      etapas,
      nodusRecord: p,
      exhaustiveLookup: true
    };

    allNodusEntries.push(entry);
    byDoc.set(docNorm, entry);
    if (emailNorm.includes('@') && !byEmail.has(emailNorm)) byEmail.set(emailNorm, entry);
    const phoneNorm = normalizeNodusPhone(p.telefono);
    if (phoneNorm && !byPhone.has(phoneNorm)) byPhone.set(phoneNorm, entry);
    if (nameNorm && !byName.has(nameNorm)) byName.set(nameNorm, entry);
  }

  // 1. Cruzar cada contrato firmado en Causa OS contra Nodus en vivo
  const enrichedContracts = signedContracts.map((contract) => {
    const docNorm = normalizeNodusDoc(contract.numeroDocumento || contract.doc);
    const emailNorm = normalizeNodusEmail(contract.email);
    const phoneNorm = normalizeNodusPhone(contract.telefono || contract.celular);
    const nameNorm = normalizeNodusText(contract.nombre || contract.nombreCompleto || '');

    let matched = null;
    let matchBy = null;

    if (docNorm.length >= 5 && byDoc.has(docNorm)) {
      matched = byDoc.get(docNorm);
      matchBy = 'DNI';
    } else if (emailNorm.includes('@') && byEmail.has(emailNorm)) {
      matched = byEmail.get(emailNorm);
      matchBy = 'EMAIL';
    } else if (phoneNorm && byPhone.has(phoneNorm)) {
      matched = byPhone.get(phoneNorm);
      matchBy = 'TELEFONO';
    } else if (nameNorm && byName.has(nameNorm)) {
      matched = byName.get(nameNorm);
      matchBy = 'NOMBRE';
    } else if (nameNorm) {
      const tokens = nameNorm.split(' ').filter((t) => t.length > 2);
      if (tokens.length >= 2) {
        const fuzzy = allNodusEntries.find((e) => {
          const target = normalizeNodusText(e.nombre);
          const hits = tokens.filter((t) => target.includes(t));
          return hits.length >= Math.min(3, tokens.length);
        });
        if (fuzzy) {
          matched = fuzzy;
          matchBy = 'NOMBRE';
        }
      }
    }

    const contractTeamLabel = contract.equipo || contract.cohorte || contract.equipoCohorte || '';
    const fallbackCheckin = getLimaMaestriaCheckinInfo(contractTeamLabel);

    const estadoCruce = !matched
      ? 'NO_ENCONTRADO_NODUS'
      : matched.maestriaNodus
      ? 'COMPLETO'
      : 'FALTA_CHECKIN_NODUS';

    return {
      ...contract,
      nodusCross: {
        matched: Boolean(matched),
        matchBy,
        nodusId: matched?.nodusId || null,
        nodusDoc: matched?.identificacion || null,
        dniMismatch: Boolean(matched && docNorm.length >= 5 && matched.docNorm.length >= 5 && docNorm !== matched.docNorm),
        nodusTeamId: matched?.equipoId || null,
        nodusTeamName: matched?.equipoNombre || null,
        fdsVigente: matched?.fdsVigente || null,
        nodusRole: matched?.rolLabel || null,
        coordinador: matched?.coordinador || null,
        asistioC1: Boolean(matched?.asistioC1),
        pagadoC1: Boolean(matched?.pagadoC1),
        desertorC1: Boolean(matched?.desertorC1),
        pagadoC2: Boolean(matched?.pagadoC2),
        asistioC2: Boolean(matched?.asistioC2),
        maestriaNodus: Boolean(matched?.maestriaNodus),
        checkinUrl: matched?.checkinUrl || fallbackCheckin?.url || null,
        etapas: matched?.etapas || [],
        nodusRecord: matched?.nodusRecord || null,
        coherenciaPrevia: matched ? evaluatePriorCoherence(matched) : null,
        exhaustiveLookup: Boolean(matched?.exhaustiveLookup),
        estadoCruce
      }
    };
  });

  // 2. Construir Padrón Vivo de Nodus Maestría (personas en Maestría, Managers, C2 pagados o ya firmados)
  const nodusPadronCross = [];
  for (const entry of allNodusEntries) {
    const matchInfo = findContractForNodusPerson(
      {
        identificacion: entry.identificacion,
        email: entry.email,
        nombres: entry.nombre,
        apellidos: '',
        nombre_preferido: entry.nombrePreferido
      },
      signedContracts
    );

    const isSigned = Boolean(matchInfo?.contract);
    const isRelevant = entry.maestriaNodus || isSigned;

    if (!isRelevant) continue;

    let estadoOperativo = 'PENDIENTE_AMBOS';
    if (isSigned && entry.maestriaNodus) estadoOperativo = 'COMPLETO';
    else if (isSigned && !entry.maestriaNodus) estadoOperativo = 'FALTA_CHECKIN_NODUS';
    else if (!isSigned && entry.maestriaNodus) estadoOperativo = 'FALTA_FIRMA_CONTRATO';

    nodusPadronCross.push({
      ...entry,
      isSigned,
      contractMatchBy: matchInfo?.matchBy || null,
      signature: matchInfo?.contract || null,
      coherenciaPrevia: evaluatePriorCoherence(entry),
      estadoOperativo
    });
  }

  // 3. Resumen por Equipo + FDS vigente
  const teamSummaries = activeTeams.map((eq) => {
    const teamNum = extractTeamNumber(eq.nombre);
    const fdsVigente = String(eq.etapa_vigente || '').toUpperCase().trim();
    const checkinInfo = getLimaMaestriaCheckinInfo(eq.nombre);
    const teamNodus = nodusPadronCross.filter((p) => p.equipoId === eq.id);
    const teamSigned = enrichedContracts.filter((c) => {
      if (c.nodusCross.nodusTeamId != null) return c.nodusCross.nodusTeamId === eq.id;
      return teamNum && extractTeamNumber(c.equipo || c.cohorte || c.equipoCohorte) === teamNum;
    });

    const isContractManager = (c) =>
      String(c.nodusCross?.nodusRole || c.rol || c.rolActividad || '').toLowerCase().includes('manager');

    const nodusMaestriaCount = teamNodus.filter((p) => p.maestriaNodus).length;
    const nodusManagersMaestria = teamNodus.filter((p) => p.maestriaNodus && p.tipoPersona === 'manager').length;
    const nodusParticipantesMaestria = teamNodus.filter((p) => p.maestriaNodus && p.tipoPersona !== 'manager').length;
    const completosList = teamNodus.filter((p) => p.estadoOperativo === 'COMPLETO');
    const completos = completosList.length;
    const completosMgr = completosList.filter((p) => p.tipoPersona === 'manager').length;
    const completosPart = completos - completosMgr;
    const faltaFirmaList = teamNodus.filter((p) => p.estadoOperativo === 'FALTA_FIRMA_CONTRATO');
    const faltaFirma = faltaFirmaList.length;
    const faltaFirmaMgr = faltaFirmaList.filter((p) => p.tipoPersona === 'manager').length;
    const faltaFirmaPart = faltaFirma - faltaFirmaMgr;
    const faltaCheckinList = teamSigned.filter((c) => c.nodusCross.estadoCruce === 'FALTA_CHECKIN_NODUS');
    const faltaCheckin = faltaCheckinList.length;
    const faltaCheckinMgr = faltaCheckinList.filter(isContractManager).length;
    const faltaCheckinPart = faltaCheckin - faltaCheckinMgr;

    return {
      equipoId: eq.id,
      equipoNombre: eq.nombre,
      equipoNum: teamNum,
      fdsVigente,
      checkinUrl: checkinInfo?.url || null,
      totalPadronNodus: teamNodus.length,
      nodusMaestriaCount,
      nodusManagersMaestria,
      nodusParticipantesMaestria,
      firmadosCount: teamSigned.length,
      completos,
      completosPart,
      completosMgr,
      faltaFirma,
      faltaFirmaPart,
      faltaFirmaMgr,
      faltaCheckin,
      faltaCheckinPart,
      faltaCheckinMgr
    };
  });

  const isSignedManager = (c) =>
    String(c.nodusCross?.nodusRole || c.rol || c.rolActividad || '').toLowerCase().includes('manager');
  const allCompletos = enrichedContracts.filter((c) => c.nodusCross.estadoCruce === 'COMPLETO');
  const totalCompletosMgr = allCompletos.filter(isSignedManager).length;
  const totalCompletosPart = allCompletos.length - totalCompletosMgr;
  const allFaltaCheckin = enrichedContracts.filter((c) => c.nodusCross.estadoCruce === 'FALTA_CHECKIN_NODUS');
  const totalFaltaCheckinMgr = allFaltaCheckin.filter(isSignedManager).length;
  const totalFaltaCheckinPart = allFaltaCheckin.length - totalFaltaCheckinMgr;
  const allFaltaFirma = nodusPadronCross.filter((p) => p.estadoOperativo === 'FALTA_FIRMA_CONTRATO');
  const totalFaltaFirmaMgr = allFaltaFirma.filter((p) => p.tipoPersona === 'manager').length;
  const totalFaltaFirmaPart = allFaltaFirma.length - totalFaltaFirmaMgr;

  const summary = {
    totalNodusPadron: nodusPadronCross.length,
    totalNodusMaestria: nodusPadronCross.filter((p) => p.maestriaNodus).length,
    totalNodusManagers: nodusPadronCross.filter((p) => p.tipoPersona === 'manager' && p.maestriaNodus).length,
    totalNodusCoherentes: nodusPadronCross.filter((p) => p.maestriaNodus && p.coherenciaPrevia?.isCoherent).length,
    totalNodusConObservacion: nodusPadronCross.filter((p) => p.maestriaNodus && p.coherenciaPrevia && !p.coherenciaPrevia.isCoherent).length,
    totalCompletos: allCompletos.length,
    totalCompletosPart,
    totalCompletosMgr,
    totalFaltaCheckinNodus: allFaltaCheckin.length,
    totalFaltaCheckinPart,
    totalFaltaCheckinMgr,
    totalFaltaFirmaContrato: allFaltaFirma.length,
    totalFaltaFirmaPart,
    totalFaltaFirmaMgr,
    totalNoEncontradoNodus: enrichedContracts.filter((c) => c.nodusCross.estadoCruce === 'NO_ENCONTRADO_NODUS').length
  };

  return {
    activeTeams,
    enrichedContracts,
    nodusPadronCross,
    teamSummaries,
    summary
  };
}
