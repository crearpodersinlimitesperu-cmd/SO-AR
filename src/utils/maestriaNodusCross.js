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

export function buildMaestriaNodusCross({
  signedContracts = [],
  nodusEquipos = [],
  nodusRosterByTeam = {}
} = {}) {
  const activeTeams = selectActiveLimaMaestriaTeams(nodusEquipos);

  // Indexar todas las personas de Nodus de los equipos activos de Maestría Lima
  const allNodusEntries = [];
  const byDoc = new Map();
  const byEmail = new Map();
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
      const pagadoC2 = Boolean(p.capitulo2?.pagado);
      const asistioC1 = Boolean(p.capitulo1?.asistio);
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
        desertorC1,
        pagadoC2,
        maestriaNodus,
        checkinUrl: checkinInfo?.url || null
      };

      allNodusEntries.push(entry);
      if (docNorm.length >= 5 && !byDoc.has(docNorm)) byDoc.set(docNorm, entry);
      if (emailNorm.includes('@') && !byEmail.has(emailNorm)) byEmail.set(emailNorm, entry);
      if (nameNorm && !byName.has(nameNorm)) byName.set(nameNorm, entry);
    }
  }

  // 1. Cruzar cada contrato firmado en Causa OS contra Nodus en vivo
  const enrichedContracts = signedContracts.map((contract) => {
    const docNorm = normalizeNodusDoc(contract.numeroDocumento || contract.doc);
    const emailNorm = normalizeNodusEmail(contract.email);
    const nameNorm = normalizeNodusText(contract.nombre || contract.nombreCompleto || '');

    let matched = null;
    let matchBy = null;

    if (docNorm.length >= 5 && byDoc.has(docNorm)) {
      matched = byDoc.get(docNorm);
      matchBy = 'DNI';
    } else if (emailNorm.includes('@') && byEmail.has(emailNorm)) {
      matched = byEmail.get(emailNorm);
      matchBy = 'EMAIL';
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
        nodusTeamId: matched?.equipoId || null,
        nodusTeamName: matched?.equipoNombre || null,
        fdsVigente: matched?.fdsVigente || null,
        nodusRole: matched?.rolLabel || null,
        coordinador: matched?.coordinador || null,
        asistioC1: Boolean(matched?.asistioC1),
        desertorC1: Boolean(matched?.desertorC1),
        pagadoC2: Boolean(matched?.pagadoC2),
        maestriaNodus: Boolean(matched?.maestriaNodus),
        checkinUrl: matched?.checkinUrl || fallbackCheckin?.url || null,
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
    const isRelevant =
      entry.maestriaNodus ||
      entry.pagadoC2 ||
      entry.tipoPersona === 'manager' ||
      isSigned;

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
      if (c.nodusCross.nodusTeamId === eq.id) return true;
      return teamNum && extractTeamNumber(c.equipo || c.cohorte || c.equipoCohorte) === teamNum;
    });

    const nodusMaestriaCount = teamNodus.filter((p) => p.maestriaNodus).length;
    const nodusManagersMaestria = teamNodus.filter((p) => p.maestriaNodus && p.tipoPersona === 'manager').length;
    const nodusParticipantesMaestria = teamNodus.filter((p) => p.maestriaNodus && p.tipoPersona !== 'manager').length;
    const completos = teamNodus.filter((p) => p.estadoOperativo === 'COMPLETO').length;
    const faltaFirma = teamNodus.filter((p) => p.estadoOperativo === 'FALTA_FIRMA_CONTRATO').length;
    const faltaCheckin = teamSigned.filter((c) => c.nodusCross.estadoCruce === 'FALTA_CHECKIN_NODUS').length;

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
      faltaFirma,
      faltaCheckin
    };
  });

  const summary = {
    totalNodusPadron: nodusPadronCross.length,
    totalNodusMaestria: nodusPadronCross.filter((p) => p.maestriaNodus).length,
    totalNodusManagers: nodusPadronCross.filter((p) => p.tipoPersona === 'manager' && p.maestriaNodus).length,
    totalCompletos: enrichedContracts.filter((c) => c.nodusCross.estadoCruce === 'COMPLETO').length,
    totalFaltaCheckinNodus: enrichedContracts.filter((c) => c.nodusCross.estadoCruce === 'FALTA_CHECKIN_NODUS').length,
    totalFaltaFirmaContrato: nodusPadronCross.filter((p) => p.estadoOperativo === 'FALTA_FIRMA_CONTRATO').length,
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
