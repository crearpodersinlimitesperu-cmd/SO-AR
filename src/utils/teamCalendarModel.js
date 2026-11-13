import { normalizeSede } from '../data/usersData.js';

/**
 * Formatea una fecha en clave local YYYY-MM-DD sin desfase UTC.
 */
export function formatLocalDateKey(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parsea un rango horario ('08:30 - 12:00' o '12:00') en minutos desde medianoche.
 */
export function parseTimeRange(timeStr) {
  if (!timeStr) return { startMin: 24 * 60, endMin: 24 * 60, durationMin: 0 };
  const matches = [...String(timeStr).matchAll(/(\d{1,2}):(\d{2})/g)];
  if (matches.length === 0) return { startMin: 24 * 60, endMin: 24 * 60, durationMin: 0 };
  const startMin = Number(matches[0][1]) * 60 + Number(matches[0][2]);
  const endMin = matches.length >= 2
    ? Number(matches[1][1]) * 60 + Number(matches[1][2])
    : startMin + 30;
  const safeEnd = endMin >= startMin ? endMin : startMin + 30;
  return { startMin, endMin: safeEnd, durationMin: safeEnd - startMin };
}

/**
 * Ordena bloques cronológicamente por hora de inicio y luego fin.
 */
export function sortBlocksChronologically(blocks) {
  return [...(blocks || [])].sort((a, b) => {
    const rA = parseTimeRange(a?.time);
    const rB = parseTimeRange(b?.time);
    if (rA.startMin !== rB.startMin) return rA.startMin - rB.startMin;
    return rA.endMin - rB.endMin;
  });
}

/**
 * Detecta cruces horarios reales entre bloques del mismo rol y sede compatible.
 * @returns {Set<string>} IDs de bloques con traslape horario
 */
export function detectBlockConflicts(blocks) {
  const sorted = sortBlocksChronologically(blocks);
  const conflicts = new Set();

  for (let i = 0; i < sorted.length; i += 1) {
    const a = sorted[i];
    const rA = parseTimeRange(a?.time);
    if (rA.durationMin <= 0) continue;

    for (let j = i + 1; j < sorted.length; j += 1) {
      const b = sorted[j];
      const rB = parseTimeRange(b?.time);
      if (rB.startMin >= rA.endMin) break;

      const sameRole = a.roleCategory === b.roleCategory;
      const sedeA = normalizeSede(a.sede || 'Todas');
      const sedeB = normalizeSede(b.sede || 'Todas');
      const compatibleSede = sedeA === 'Todas' || sedeB === 'Todas' || sedeA === sedeB;

      if (sameRole && compatibleSede) {
        conflicts.add(a.id);
        conflicts.add(b.id);
      }
    }
  }
  return conflicts;
}

/**
 * Determina el estado en tiempo real de un bloque para la fecha seleccionada.
 */
export function getBlockLiveStatus(block, selectedDate, now = new Date()) {
  const selectedKey = formatLocalDateKey(selectedDate);
  const todayKey = formatLocalDateKey(now);
  if (!selectedKey || !todayKey) return 'scheduled';
  if (selectedKey < todayKey) return 'past';
  if (selectedKey > todayKey) return 'scheduled';

  const { startMin, endMin } = parseTimeRange(block?.time);
  if (startMin >= 24 * 60) return 'scheduled';
  const nowMin = now.getHours() * 60 + now.getMinutes();

  if (nowMin >= startMin && nowMin < endMin) return 'active';
  if (nowMin < startMin) return 'upcoming';
  return 'done';
}

/**
 * Filtra eventos del calendario oficial por la sede seleccionada.
 */
export function filterCalendarEventsBySede(dayEvents, selectedSede) {
  const list = Array.isArray(dayEvents) ? dayEvents : [];
  if (!selectedSede || selectedSede === 'Todas' || selectedSede === 'all') return list;
  const target = normalizeSede(selectedSede);
  if (!target || target === 'Sede Global' || target === 'Global') return list;

  return list.filter(ev => {
    const evSedeRaw = ev?.sede || ev?.sedeTag || '';
    if (!evSedeRaw || evSedeRaw === 'Todas' || evSedeRaw === 'Global' || evSedeRaw === 'Sede Global') {
      return true;
    }
    return normalizeSede(evSedeRaw) === target;
  });
}

/**
 * Resume métricas logísticas de Time-Boxing para un conjunto de bloques.
 */
export function summarizeDayTimeBoxing(blocks) {
  const list = Array.isArray(blocks) ? blocks : [];
  const conflicts = detectBlockConflicts(list);
  let totalMinutes = 0;
  let deadlines = 0;

  list.forEach(b => {
    const { durationMin } = parseTimeRange(b?.time);
    totalMinutes += durationMin;
    if (b?.type === 'Deadline') deadlines += 1;
  });

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const hoursLabel = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;

  return {
    totalBlocks: list.length,
    totalMinutes,
    hoursLabel,
    deadlines,
    conflictCount: conflicts.size,
    conflictIds: conflicts
  };
}

/**
 * Combina bloques maestros actualizados con los bloques personalizados guardados por el usuario,
 * evitando duplicar o congelar versiones antiguas del cronograma maestro.
 */
export function mergeCustomAndMasterBlocks(masterBlocks, storedBlocks) {
  const master = Array.isArray(masterBlocks) ? masterBlocks : [];
  const masterIds = new Set(master.map(b => b.id));
  const stored = Array.isArray(storedBlocks) ? storedBlocks : [];
  const customOnly = stored.filter(b => b && b.id && !masterIds.has(b.id));
  return [...customOnly, ...master];
}

/**
 * Devuelve los 7 días (Lun a Dom) de la semana que contiene a `referenceDate`.
 */
export function getWeekDaysMondayToSunday(referenceDate) {
  const base = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const mondayOffset = (base.getDay() + 6) % 7;
  const monday = new Date(base.getFullYear(), base.getMonth(), base.getDate() - mondayOffset);
  return Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
}
