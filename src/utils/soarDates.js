// Sistema de Cálculo Automático de Fechas y Horas Límite SO-AR
// Conecta la información de los manuales operativos con las fechas del ciclo activo

import { cyclesData } from '../data/cyclesData';

const addDays = (dateStr, days) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

// Reglas relativas extraídas de los manuales del SO-AR
const TASK_DEADLINE_RULES = {
  // --- GATE T-30 ---
  't30_presupuesto': { base: 'c1_start', offsetDays: -30, time: '18:00', label: 'T-30' },
  't30_salon': { base: 'c1_start', offsetDays: -30, time: '18:00', label: 'T-30' },
  't30_entrenador': { base: 'c1_start', offsetDays: -30, time: '18:00', label: 'T-30' },
  't30_hotel': { base: 'c1_start', offsetDays: -30, time: '18:00', label: 'T-30' },
  't30_vuelo': { base: 'c1_start', offsetDays: -30, time: '18:00', label: 'T-30' },

  // --- GATE T-21 a T-7 ---
  't21_censo': { base: 'c1_start', offsetDays: -21, time: '18:00', label: 'T-21' },
  't14_apoyo': { base: 'c1_start', offsetDays: -14, time: '18:00', label: 'T-14' },
  't7_freeze': { base: 'c1_start', offsetDays: -7, time: '18:00', label: 'T-7' },
  't7_uniformes': { base: 'c1_start', offsetDays: -7, time: '18:00', label: 'T-7' },

  // --- C1 ---
  'c1_registro': { base: 'c1_start', offsetDays: 0, time: '08:00', label: 'C1 Viernes 08:00' },
  'c1_contencion': { base: 'c1_start', offsetDays: 0, time: '19:00', label: 'C1 Viernes 19:00' },

  // --- POST C1 ---
  'postc1_devolucion': { base: 'c1_start', offsetDays: 3, time: '12:00', label: 'Lunes POST-C1' },
  'postc1_rezagados': { base: 'c1_start', offsetDays: 4, time: '18:00', label: 'Martes POST-C1' },

  // --- C2 ---
  'c2_grounding': { base: 'c2_start', offsetDays: 0, time: '07:30', label: 'C2 Viernes 07:30' },
  'c2_mesas': { base: 'c2_start', offsetDays: 0, time: '16:00', label: 'C2 Viernes 16:00' },
  'gatec2_grounding': { base: 'c2_start', offsetDays: -1, time: '18:00', label: 'Jueves Pre-C2' },
  'gatec2_rezagados': { base: 'c2_start', offsetDays: -1, time: '19:00', label: 'Jueves Pre-C2' },

  // --- PRE-MJ ---
  'premj_managers': { base: 'maestria_start', offsetDays: -7, time: '18:00', label: 'T-7 MJ' },
  'premj_entrenador': { base: 'maestria_start', offsetDays: -7, time: '18:00', label: 'T-7 MJ' },

  // --- MAESTRÍA (MJ) ---
  'mj_registro': { base: 'maestria_start', offsetDays: 0, time: '08:00', label: 'MJ Viernes 08:00' },
  'mj_imposibles': { base: 'maestria_start', offsetDays: 1, time: '15:00', label: 'MJ Sábado 15:00' },

  // --- POST-MAESTRÍA ---
  'cmj_post_1': { base: 'maestria_start', offsetDays: 4, time: '18:00', label: 'Lunes Post-MJ 18:00' },
  'cmj_post_2': { base: 'maestria_start', offsetDays: 5, time: '18:00', label: 'Martes Cierre de Oro 18:00' },
  'cierre_mj_oro': { base: 'maestria_end', offsetDays: 0, time: '20:00', label: 'Domingo MJ' }
};

/**
 * Calcula la fecha y hora límite automática de una tarea según el ciclo SO-AR
 * @param {Object} task - La tarea del checklist
 * @param {Object} cycle - El ciclo activo (o default a cyclesData[0])
 * @returns {String} Fecha y hora límite calculada automáticamente (ej. '2026-08-07 09:00')
 */
export const calculateAutomaticDeadline = (task, cycle = null) => {
  if (!task) return '';
  
  // Si la tarea ya tiene una fecha manual personalizada asignada por el Gerente, respetarla
  if (task.deadline && task.deadline.includes('-') && task.deadline.includes(':')) {
    return task.deadline;
  }

  const activeCycle = cycle || (cyclesData && cyclesData.length > 0 ? cyclesData[0] : null);
  if (!activeCycle) {
    return task.deadline || 'Pendiente de ciclo';
  }

  const rule = TASK_DEADLINE_RULES[task.id];
  if (rule) {
    const baseDate = activeCycle[rule.base] || activeCycle.c1_start;
    if (baseDate) {
      const calculatedDate = addDays(baseDate, rule.offsetDays);
      return `${calculatedDate} ${rule.time}`;
    }
  }

  // Fallback inteligente basado en la fase del ciclo
  const phase = task.cyclePhase || 'PRE-C1';
  let fallbackBase = activeCycle.c1_start;
  let fallbackOffset = 0;

  if (phase === 'GATE 1') {
    fallbackBase = activeCycle.c1_start;
    fallbackOffset = -28;
  } else if (phase === 'PRE-C1') {
    fallbackBase = activeCycle.c1_start;
    fallbackOffset = -3;
  } else if (phase === 'C1') {
    fallbackBase = activeCycle.c1_start;
    fallbackOffset = 0;
  } else if (phase === 'POST-C1') {
    fallbackBase = activeCycle.c1_start;
    fallbackOffset = 3;
  } else if (phase === 'C2') {
    fallbackBase = activeCycle.c2_start || activeCycle.c1_start;
    fallbackOffset = 0;
  } else if (phase === 'PRE-MJ' || phase === 'MJ') {
    fallbackBase = activeCycle.maestria_start || activeCycle.c2_start || activeCycle.c1_start;
    fallbackOffset = 0;
  } else if (phase === 'POST-MJ') {
    fallbackBase = activeCycle.maestria_start || activeCycle.c1_start;
    fallbackOffset = 4;
  }

  if (fallbackBase) {
    const calculatedDate = addDays(fallbackBase, fallbackOffset);
    return `${calculatedDate} 18:00`;
  }

  return task.deadline || 'Fecha según ciclo';
};
