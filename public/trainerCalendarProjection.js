export const TRAINER_CALENDAR_SYNC_AGENT_ID = 'agente-sincronizador-asignador-calendario';
export const TRAINER_CALENDAR_SYNC_AGENT_NAME = 'Agente Guardián de Sincronización Asignador ↔ Calendario Global';

export const ORDERED_ASSIGNMENT_SLOTS = ['unico', 'Creación', 'Relación', 'Gratitud'];

export function normalizeTrainerCalendarSede(sede = '') {
  const raw = String(sede || '').trim();
  const clean = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (raw === 'MED' || clean.includes('medell')) return 'Medellín';
  if (raw === 'LIM' || clean.includes('lima')) return 'Lima';
  if (raw === 'CUE' || clean.includes('cuenca')) return 'Cuenca';
  if (raw === 'GYE' || clean.includes('guayaquil')) return 'Guayaquil';
  if (raw === 'MEX' || clean.includes('mex') || clean.includes('cdmx')) return 'México';
  if (
    raw === 'UIO-C1' ||
    raw === 'UIO-C2' ||
    raw === 'UIO' ||
    raw.startsWith('UIO') ||
    clean.includes('uio') ||
    clean.includes('quito') ||
    clean.includes('ciclo 1') ||
    clean.includes('ciclo 2')
  ) {
    return 'Quito';
  }
  if (raw === 'INT' || clean.includes('intern')) return 'Internacional';
  if (clean.includes('global')) return 'Sede Global';
  return raw || 'Sede Global';
}

export function normalizeTrainerCalendarTeam(equipo = '') {
  if (equipo === null || equipo === undefined) return '';
  let raw = String(equipo).trim();
  if (!raw) return '';
  if (/^\d+\.0+$/.test(raw)) {
    raw = raw.split('.')[0];
  }
  return raw;
}

export function extractTeamDigitsKey(equipo = '') {
  const cleaned = normalizeTrainerCalendarTeam(equipo);
  if (!cleaned) return '';
  let digits = cleaned.match(/\d+/g);
  if (!digits || digits.length === 0) return cleaned.toUpperCase();
  if (digits.length === 1 && (digits[0].length === 4 || digits[0].length === 6)) {
    const rawNum = digits[0];
    const chunks = [];
    for (let i = 0; i < rawNum.length; i += 2) {
      chunks.push(rawNum.slice(i, i + 2));
    }
    digits = chunks;
  }
  const sortedUnique = [...new Set(digits)].sort((a, b) => Number(a) - Number(b));
  return sortedUnique.join('');
}

export function normalizeTrainingNameKey(nombre = '') {
  return String(nombre || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export function ajustarFechaFinCalendario(nombre = '', inicioRaw = '', finRaw = '') {
  if (!inicioRaw) return finRaw || '';
  const n = String(nombre || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const unSoloDia = [
    'tanque',
    'rompimiento',
    'caida',
    'confianza',
    'caminata',
    'fuego',
    'impacto',
    'revision',
    'revisacion',
  ];
  if (unSoloDia.some(kw => n.includes(kw))) return inicioRaw;

  const terminaDomingo = [
    'capitulo uno',
    'capitulo 1',
    'c1',
    'capitulo dos',
    'capitulo 2',
    'c2',
    'maestria',
    'mj',
    'creacion',
    'relacion',
    'gratitud',
    'viaje',
    'confesiones',
  ];
  if (!terminaDomingo.some(kw => n.includes(kw))) return finRaw || inicioRaw;

  const partes = String(inicioRaw).slice(0, 10).split('-');
  if (partes.length !== 3) return finRaw || inicioRaw;
  const d = new Date(parseInt(partes[0], 10), parseInt(partes[1], 10) - 1, parseInt(partes[2], 10));
  if (Number.isNaN(d.getTime())) return finRaw || inicioRaw;
  const diff = d.getDay() === 0 ? 0 : 7 - d.getDay();
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const time = String(inicioRaw).includes('T') ? String(inicioRaw).substring(10) : 'T00:00:00';
  return `${y}-${m}-${dd}${time}`;
}

export function buildAsignadorEventKey(ev = {}, sedeFallback = '') {
  const f = String(ev.fecha_inicio || ev.start || ev.fechaInicio || '').slice(0, 10);
  const s = normalizeTrainerCalendarSede(ev.sede || ev.sedeTag || sedeFallback || '');
  const n = String(ev.nombre || ev.name || ev.entrenamiento || '').trim();
  const eq = normalizeTrainerCalendarTeam(ev.equipo ?? ev.team ?? '');
  return `${f}__${s}__${n}${eq ? '__' + eq : ''}`.replace(/\//g, '-');
}

export function buildAsignadorEventKeyNoTeam(ev = {}, sedeFallback = '') {
  const f = String(ev.fecha_inicio || ev.start || ev.fechaInicio || '').slice(0, 10);
  const s = normalizeTrainerCalendarSede(ev.sede || ev.sedeTag || sedeFallback || '');
  const n = String(ev.nombre || ev.name || ev.entrenamiento || '').trim();
  return `${f}__${s}__${n}`.replace(/\//g, '-');
}

export function mergeOfficialCalendar(apiEvents = [], sheetEvents = []) {
  const keyFor = event => [
    String(event.fecha_inicio || event.start || '').slice(0, 10),
    normalizeTrainerCalendarSede(event.sede || event.sedeTag),
    normalizeTrainingNameKey(event.nombre || event.name),
    extractTeamDigitsKey(event.equipo ?? event.team),
  ].join('__');
  const byKey = new Map(apiEvents.map(event => [keyFor(event), event]));
  for (const event of sheetEvents) {
    const key = keyFor(event);
    const previous = byKey.get(key);
    byKey.set(key, {
      ...previous,
      ...event,
      fecha_fin: previous?.fecha_fin || previous?.end || event.fecha_fin || event.end || '',
      ticket: previous?.ticket || 'pending',
      hotel: previous?.hotel || 'pending',
      notified: previous?.notified || false,
      arrival: previous?.arrival || '',
      ticket_url: previous?.ticket_url || '',
    });
  }
  return [...byKey.values()];
}

export function buildCanonicalEventKeys(ev = {}, sedeFallback = '') {
  const f = String(ev.fecha_inicio || ev.start || ev.fechaInicio || '').slice(0, 10);
  const s = normalizeTrainerCalendarSede(ev.sede || ev.sedeTag || sedeFallback || '');
  const nRaw = String(ev.nombre || ev.name || ev.entrenamiento || '').trim();
  const nNorm = normalizeTrainingNameKey(nRaw);
  const eqRaw = normalizeTrainerCalendarTeam(ev.equipo ?? ev.team ?? '');
  const eqDigits = extractTeamDigitsKey(eqRaw);

  const keys = [];
  if (ev.__sourceEventKey) keys.push(String(ev.__sourceEventKey));
  if (ev.sourceEventKey) keys.push(String(ev.sourceEventKey));
  if (ev.__assignmentKey) keys.push(String(ev.__assignmentKey));
  if (ev.id) keys.push(String(ev.id));

  if (f && s && nRaw) {
    if (eqRaw) keys.push(`${f}__${s}__${nRaw}__${eqRaw}`.replace(/\//g, '-'));
    if (eqDigits) keys.push(`${f}__${s}__${nNorm}__${eqDigits}`.replace(/\//g, '-'));
    keys.push(`${f}__${s}__${nRaw}`.replace(/\//g, '-'));
    keys.push(`${f}__${s}__${nNorm}`.replace(/\//g, '-'));
  }

  return [...new Set(keys.filter(Boolean))];
}

export function extractConfirmedSlotsFromAssignment(assignment = {}) {
  if (!assignment || typeof assignment !== 'object') return [];
  return ORDERED_ASSIGNMENT_SLOTS
    .filter(slot => assignment[slot]?.entrenador && String(assignment[slot].entrenador).trim())
    .map(slot => ({
      slot,
      entrenador: String(assignment[slot].entrenador).trim(),
      fechaIso: String(assignment[slot].fechaIso || ''),
    }));
}

export function extractConfirmedTrainerFromAssignment(assignment = {}, formatDisplayFn = null) {
  const confirmedSlots = extractConfirmedSlotsFromAssignment(assignment);
  const format = typeof formatDisplayFn === 'function' ? formatDisplayFn : (v => String(v || '').trim());
  if (confirmedSlots.length > 0) {
    if (confirmedSlots.length === 1 && confirmedSlots[0].slot === 'unico') {
      return format(confirmedSlots[0].entrenador);
    }
    return confirmedSlots
      .map(item => `${item.slot === 'unico' ? '' : `${item.slot}: `}${format(item.entrenador)}`)
      .join(' / ');
  }
  const direct = String(assignment?.entrenador || assignment?.trainer || '').trim();
  return direct ? format(direct) : '';
}

export function indexAssignmentsForLookup(assignments = []) {
  const list = Array.isArray(assignments)
    ? assignments
    : Object.entries(assignments || {}).map(([id, data]) => ({ id, ...(data || {}) }));
  return { assignments: list.filter(item => item && typeof item === 'object') };
}

export function matchAssignmentForEvent(ev = {}, assignmentIndex, sedeFallback = '') {
  if (!assignmentIndex) return null;
  const f = String(ev.fecha_inicio || ev.start || ev.fechaInicio || '').slice(0, 10);
  const s = normalizeTrainerCalendarSede(ev.sede || ev.sedeTag || sedeFallback || '');
  const nRaw = String(ev.nombre || ev.name || ev.entrenamiento || '').trim();
  const nNorm = normalizeTrainingNameKey(nRaw);
  const eqRaw = normalizeTrainerCalendarTeam(ev.equipo ?? ev.team ?? '');
  const eqDigits = extractTeamDigitsKey(eqRaw);

  // Un vínculo explícito conserva la identidad aunque el Asignador cambie fecha,
  // sede o equipo. Sin vínculo, todos los campos deben coincidir.
  const ids = [ev.__assignmentKey, ev.__sourceEventKey, ev.sourceEventKey, ev.id].filter(Boolean);
  for (const id of ids) {
    const linked = assignmentIndex.assignments.filter(item => item.id === id);
    if (linked.length === 1) return linked[0];
  }
  const candidates = assignmentIndex.assignments.filter(item => {
    return f && nNorm &&
      String(item.fechaInicio || item.fecha_inicio || item.start || '').slice(0, 10) === f &&
      normalizeTrainerCalendarSede(item.sede || item.sedeTag || '') === s &&
      normalizeTrainingNameKey(item.entrenamiento || item.nombre || item.name || '') === nNorm;
  });
  const exact = candidates.filter(item => extractTeamDigitsKey(item.equipo ?? item.team ?? '') === eqDigits);
  if (exact.length === 1) return exact[0];
  if (candidates.length !== 1) return null;
  const team = extractTeamDigitsKey(candidates[0].equipo ?? candidates[0].team ?? '');
  return !eqDigits || !team || eqDigits === team ? candidates[0] : null;
}

export function calendarEventsForLocalDay(events = [], date) {
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return events.filter(event => {
    const start = String(event.fecha_inicio || event.start || event.fechaInicio || event.startDate || event.date || '').slice(0, 10);
    const end = String(event.fecha_fin || event.end || event.fechaFin || event.endDate || start).slice(0, 10);
    return Boolean(start) && day >= start && day <= end;
  });
}

/**
 * Proyección autoritativa del Asignador de Entrenadores sobre los eventos del calendario.
 * Regla de oro:
 * - `/asignador-entrenadores` es la ÚNICA fuente de verdad para `trainer` / `entrenador` y overrides de fechas.
 * - El entrenador que venía en la hoja de Google se conserva únicamente en `sheetTrainer`
 *   como referencia/sugerencia para el selector del Asignador, NUNCA como entrenador confirmado.
 */
export function applyAsignadorAuthoritativeProjection(sourceEventsOrOptions = [], assignmentsArg = [], operationalChangesArg = []) {
  let sourceEvents = sourceEventsOrOptions;
  let assignments = assignmentsArg;
  let operationalChanges = operationalChangesArg;
  if (
    sourceEventsOrOptions &&
    !Array.isArray(sourceEventsOrOptions) &&
    typeof sourceEventsOrOptions === 'object'
  ) {
    sourceEvents = sourceEventsOrOptions.rawEvents || sourceEventsOrOptions.sourceEvents || [];
    assignments = sourceEventsOrOptions.assignments || [];
    if (Array.isArray(sourceEventsOrOptions.operationalChanges)) {
      operationalChanges = sourceEventsOrOptions.operationalChanges;
    } else {
      const ovList = Object.entries(sourceEventsOrOptions.overrides || {}).map(([id, val]) => ({
        id,
        kind: 'override',
        sourceEventKey: val?.sourceEventKey || id,
        ...(val || {}),
      }));
      const custList = (sourceEventsOrOptions.customEvents || []).map(item => ({
        kind: 'custom',
        ...(item || {}),
      }));
      operationalChanges = [...ovList, ...custList];
    }
  }
  operationalChanges = normalizeOperationalChanges(operationalChanges || []);
  const assignmentIndex = indexAssignmentsForLookup(assignments);

  const overridesBySourceKey = new Map();
  const customByKey = new Map();
  const sourceCounts = new Map();
  for (const event of sourceEvents || []) {
    const key = buildAsignadorEventKeyNoTeam(event);
    sourceCounts.set(key, (sourceCounts.get(key) || 0) + 1);
  }
  for (const item of operationalChanges || []) {
    if (item?.kind === 'override' && (item.sourceEventKey || item.id)) {
      const k = String(item.sourceEventKey || item.id);
      overridesBySourceKey.set(k, item);
    }
    if (item?.kind === 'custom' && item.id) customByKey.set(String(item.id), item);
  }

  const result = (sourceEvents || []).map(event => {
    const sourceKey = event.__sourceEventKey || event.sourceEventKey || buildAsignadorEventKey(event);
    const sourceKeyNoTeam = buildAsignadorEventKeyNoTeam(event);
    const noTeamCount = sourceCounts.get(sourceKeyNoTeam);
    const override = customByKey.get(sourceKey) || overridesBySourceKey.get(sourceKey) ||
      (noTeamCount === 1 ? overridesBySourceKey.get(sourceKeyNoTeam) : null);

    const rawSheetTrainer =
      typeof event.sheetTrainer !== 'undefined'
        ? event.sheetTrainer
        : String(event.trainer || event.entrenador || '').trim();

    const nombreFinal = override?.nombre || event.nombre || event.name || '';
    const inicioFinal = override?.fechaInicio || event.fecha_inicio || event.start || event.fechaInicio || '';
    const finBase = override?.fechaFin || event.fecha_fin || event.end || event.fechaFin || '';
    const finFinal = override?.fechaFin || ajustarFechaFinCalendario(nombreFinal, inicioFinal, finBase);

    const updatedEvent = {
      ...event,
      __sourceEventKey: sourceKey,
      __assignmentKey: event.__assignmentKey || sourceKey,
      sheetTrainer: rawSheetTrainer,
      ...(override
        ? {
            nombre: nombreFinal,
            name: nombreFinal,
            sede: override.sede || event.sede,
            sedeTag: override.sede || event.sedeTag,
            equipo: override.equipo ?? event.equipo,
            lugar: override.lugar ?? event.lugar,
            fecha_inicio: inicioFinal,
            fecha_fin: finFinal,
            start: inicioFinal,
            end: finFinal,
          }
        : {
            fecha_fin: finFinal,
            end: finFinal,
          }),
    };

    const assignmentDoc =
      matchAssignmentForEvent(updatedEvent, assignmentIndex) ||
      matchAssignmentForEvent(event, assignmentIndex);
    if (assignmentDoc) {
      updatedEvent.__assignmentKey = assignmentDoc.id || sourceKey;
      const start = override?.fechaInicio || assignmentDoc.fechaInicio || inicioFinal;
      const end = override?.fechaFin || assignmentDoc.fechaFin || finFinal;
      Object.assign(updatedEvent, {
        nombre: override?.nombre || assignmentDoc.entrenamiento || nombreFinal,
        name: override?.nombre || assignmentDoc.entrenamiento || nombreFinal,
        sede: override?.sede || assignmentDoc.sede || updatedEvent.sede,
        sedeTag: override?.sede || assignmentDoc.sede || updatedEvent.sedeTag,
        equipo: override?.equipo ?? assignmentDoc.equipo ?? updatedEvent.equipo,
        fecha_inicio: start, start,
        fecha_fin: end, end,
      });
    }

    const confirmedTrainer = extractConfirmedTrainerFromAssignment(assignmentDoc);

    if (confirmedTrainer) {
      updatedEvent.trainer = confirmedTrainer;
      updatedEvent.entrenador = confirmedTrainer;
      updatedEvent.confirmedTrainer = confirmedTrainer;
      updatedEvent.assignmentSource = 'causa_os';
      updatedEvent.__assignmentKey = assignmentDoc?.id || sourceKey;
    } else {
      // Estricto cumplimiento: si no está asignado en /asignador-entrenadores, no inventar ni heredar de Sheets como confirmado
      updatedEvent.trainer = '';
      updatedEvent.entrenador = '';
      updatedEvent.confirmedTrainer = '';
      updatedEvent.assignmentSource = 'unassigned_in_asignador';
      updatedEvent.__assignmentKey = assignmentDoc?.id || sourceKey;
    }

    return updatedEvent;
  });

  for (const item of (operationalChanges || []).filter(it => it?.kind === 'custom' && it.fechaInicio && it.nombre)) {
    const customKey = String(item.sourceEventKey || String(item.id).replace(/^custom__/, ''));
    if (result.some(event => event.__sourceEventKey === customKey)) continue;
    const finFinal = item.fechaFin || ajustarFechaFinCalendario(item.nombre, item.fechaInicio, '');
    const customEvent = {
      __sourceEventKey: customKey,
      __assignmentKey: customKey,
      id: customKey,
      fecha_inicio: item.fechaInicio,
      fecha_fin: finFinal,
      start: item.fechaInicio,
      end: finFinal,
      nombre: item.nombre,
      name: item.nombre,
      sede: item.sede,
      sedeTag: item.sede,
      equipo: item.equipo || '',
      lugar: item.lugar || '',
      direccion: '',
      sheetTrainer: '',
      trainer: '',
      entrenador: '',
      confirmedTrainer: '',
      assignmentSource: 'unassigned_in_asignador',
      origen: 'causa_os',
      esPersonalizado: true,
    };
    const assignmentDoc = matchAssignmentForEvent(customEvent, assignmentIndex);
    const confirmedTrainer = extractConfirmedTrainerFromAssignment(assignmentDoc);
    if (confirmedTrainer) {
      customEvent.trainer = confirmedTrainer;
      customEvent.entrenador = confirmedTrainer;
      customEvent.confirmedTrainer = confirmedTrainer;
      customEvent.assignmentSource = 'causa_os';
    }
    result.push(customEvent);
  }

  // Un equipo vacío no identifica a ninguno de los equipos paralelos.
  const deduplicated = [];
  const seenByBaseKey = new Map();

  for (const ev of result) {
    const d = String(ev.fecha_inicio || ev.start || '').slice(0, 10);
    const s = normalizeTrainerCalendarSede(ev.sede || ev.sedeTag || '').toUpperCase();
    const n = normalizeTrainingNameKey(ev.nombre || ev.name || '');
    const eqDigits = extractTeamDigitsKey(ev.equipo || ev.team || '');
    const baseKey = `${d}__${s}__${n}`;

    if (!seenByBaseKey.has(baseKey)) {
      seenByBaseKey.set(baseKey, [ev]);
      deduplicated.push(ev);
      continue;
    }

    const candidates = seenByBaseKey.get(baseKey);
    const matchingExisting = candidates.find(existing => {
      const existingEqDigits = extractTeamDigitsKey(existing.equipo || existing.team || '');
      return existingEqDigits === eqDigits;
    });

    if (!matchingExisting) {
      candidates.push(ev);
      deduplicated.push(ev);
    } else {
      if (ev.assignmentSource === 'causa_os' && matchingExisting.assignmentSource !== 'causa_os') {
        const preservedEquipo = matchingExisting.equipo || ev.equipo;
        const preservedSheetTrainer = matchingExisting.sheetTrainer || ev.sheetTrainer;
        Object.assign(matchingExisting, ev, {
          equipo: ev.equipo || preservedEquipo,
          sheetTrainer: preservedSheetTrainer,
        });
      } else {
        matchingExisting.equipo = matchingExisting.equipo || ev.equipo;
        matchingExisting.lugar = matchingExisting.lugar || ev.lugar;
        matchingExisting.direccion = matchingExisting.direccion || ev.direccion;
        matchingExisting.sheetTrainer = matchingExisting.sheetTrainer || ev.sheetTrainer;
        if (!matchingExisting.trainer && ev.assignmentSource === 'causa_os' && ev.trainer) {
          matchingExisting.trainer = ev.trainer;
          matchingExisting.entrenador = ev.entrenador;
          matchingExisting.confirmedTrainer = ev.confirmedTrainer;
          matchingExisting.assignmentSource = 'causa_os';
        }
      }
    }
  }

  return deduplicated.sort((a, b) => new Date(a.fecha_inicio || a.start) - new Date(b.fecha_inicio || b.start));
}

function serializeSlotMap(docData = {}) {
  return Object.fromEntries(
    ORDERED_ASSIGNMENT_SLOTS.map(slot => {
      const val = docData?.[slot];
      return [
        slot,
        val?.entrenador && String(val.entrenador).trim()
          ? {
              entrenador: String(val.entrenador).trim(),
              fechaIso: String(val.fechaIso || ''),
            }
          : null,
      ];
    })
  );
}

export function buildPublicAssignment(assignment = {}) {
  return {
    entrenamiento: String(assignment.entrenamiento || ''),
    sede: normalizeTrainerCalendarSede(assignment.sede || ''),
    fechaInicio: String(assignment.fechaInicio || ''),
    fechaFin: assignment.fechaFin ||
      ajustarFechaFinCalendario(assignment.entrenamiento || '', assignment.fechaInicio || '', '') || null,
    equipo: normalizeTrainerCalendarTeam(assignment.equipo) || null,
    ...serializeSlotMap(assignment),
    source: 'causa_os_asignador',
    syncedByAgent: TRAINER_CALENDAR_SYNC_AGENT_ID,
  };
}

export function buildPublicOperational(value = {}, kind = 'override', id = '') {
  return {
    kind,
    sourceEventKey: kind === 'override' ? String(value.sourceEventKey || id) : null,
    nombre: String(value.nombre || ''),
    sede: normalizeTrainerCalendarSede(value.sede || ''),
    equipo: normalizeTrainerCalendarTeam(value.equipo),
    lugar: String(value.lugar || ''),
    fechaInicio: String(value.fechaInicio || ''),
    fechaFin: String(value.fechaFin || ajustarFechaFinCalendario(value.nombre || '', value.fechaInicio || '', '')),
    source: 'causa_os_asignador',
  };
}

export function normalizeOperationalChanges(changes = []) {
  const byId = new Map();
  for (const item of changes) {
    const prefix = `${item.kind}__`;
    const rawId = String(item.id || '');
    const id = rawId.startsWith(prefix) ? rawId.slice(prefix.length) : rawId;
    const previous = byId.get(`${item.kind}:${id}`);
    if (!previous || item.id === id) byId.set(`${item.kind}:${id}`, { ...item, id });
  }
  return [...byId.values()];
}

function publicPayloadDiffers(current, expected) {
  if (!current) return true;
  const allowed = new Set([...Object.keys(expected), 'id', 'actualizadoEn', 'publicadoPor']);
  return Object.keys(current).some(key => !allowed.has(key)) ||
    Object.entries(expected).some(([key, value]) => JSON.stringify(current[key] ?? null) !== JSON.stringify(value));
}

/**
 * Calcula qué documentos en `calendario_asignaciones_publicas` y `calendario_operativo_publico`
 * están desincronizados respecto a la fuente canónica `/asignador-entrenadores`.
 */
export function computeCalendarProjectionPlan({
  assignments = {},
  overrides = {},
  customEvents = [],
  publicAssignments = [],
  publicOperational = [],
}) {
  const publicAssignMap = new Map(
    (Array.isArray(publicAssignments)
      ? publicAssignments
      : Object.entries(publicAssignments || {}).map(([id, d]) => ({ id, ...(d || {}) }))
    ).map(item => [String(item.id), item])
  );

  const publicOpMap = new Map(
    (Array.isArray(publicOperational)
      ? publicOperational
      : Object.entries(publicOperational || {}).map(([id, d]) => ({ id, ...(d || {}) }))
    ).map(item => [String(item.id), item])
  );

  const assignmentsToPublish = [];
  const assignmentEntries = Array.isArray(assignments)
    ? assignments.map(item => [String(item.id), item])
    : Object.entries(assignments || {});

  for (const [id, assignment] of assignmentEntries) {
    if (!id || !assignment) continue;
    const expectedPayload = buildPublicAssignment(assignment);
    const currentPublic = publicAssignMap.get(id);
    const needsSync = publicPayloadDiffers(currentPublic, expectedPayload);

    if (needsSync) {
      assignmentsToPublish.push({ id, payload: expectedPayload });
    }
  }

  const canonicalIds = new Set(assignmentEntries.map(([id]) => id));
  for (const [id, current] of publicAssignMap) {
    if (canonicalIds.has(id) || !extractConfirmedTrainerFromAssignment(current)) continue;
    assignmentsToPublish.push({
      id,
      payload: buildPublicAssignment({
        entrenamiento: current.entrenamiento, sede: current.sede,
        fechaInicio: current.fechaInicio, fechaFin: current.fechaFin, equipo: current.equipo,
      }),
    });
  }

  const operationalToPublish = [];
  const overrideEntries = Array.isArray(overrides)
    ? overrides.map(item => [String(item.id), item])
    : Object.entries(overrides || {});

  for (const [id, value] of overrideEntries) {
    if (!id || !value) continue;
    const expectedPayload = buildPublicOperational(value, 'override', id);

    const currentPublic = publicOpMap.get(id);
    const needsSync = publicPayloadDiffers(currentPublic, expectedPayload);

    if (needsSync) operationalToPublish.push({ id, payload: expectedPayload });
    const legacyId = `override__${id}`;
    if (publicOpMap.has(legacyId) && publicPayloadDiffers(publicOpMap.get(legacyId), expectedPayload)) {
      operationalToPublish.push({ id: legacyId, payload: expectedPayload });
    }
  }

  const customList = Array.isArray(customEvents)
    ? customEvents
    : Object.entries(customEvents || {}).map(([id, d]) => ({ id, ...(d || {}) }));

  for (const value of customList) {
    const id = String(value?.id || '').trim();
    if (!id) continue;
    const expectedPayload = buildPublicOperational(value, 'custom', id);

    const currentPublic = publicOpMap.get(id);
    const needsSync = publicPayloadDiffers(currentPublic, expectedPayload);

    if (needsSync) operationalToPublish.push({ id, payload: expectedPayload });
    const legacyId = `custom__${id}`;
    if (publicOpMap.has(legacyId) && publicPayloadDiffers(publicOpMap.get(legacyId), expectedPayload)) {
      operationalToPublish.push({ id: legacyId, payload: expectedPayload });
    }
  }

  return {
    agentId: TRAINER_CALENDAR_SYNC_AGENT_ID,
    inSync: assignmentsToPublish.length === 0 && operationalToPublish.length === 0,
    totalCanonicalAssignments: assignmentEntries.length,
    totalCanonicalOperational: overrideEntries.length + customList.length,
    assignmentsToPublish,
    assignmentsToWrite: assignmentsToPublish,
    operationalToPublish,
    operationalToWrite: operationalToPublish,
  };
}
