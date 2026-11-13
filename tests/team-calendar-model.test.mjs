import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatLocalDateKey,
  parseTimeRange,
  sortBlocksChronologically,
  detectBlockConflicts,
  getBlockLiveStatus,
  filterCalendarEventsBySede,
  summarizeDayTimeBoxing,
  mergeCustomAndMasterBlocks,
  getWeekDaysMondayToSunday
} from '../src/utils/teamCalendarModel.js';

describe('teamCalendarModel: Agenda, Time Boxing y Logística', () => {
  it('formatLocalDateKey formatea la fecha local YYYY-MM-DD sin desfase UTC nocturno', () => {
    const lateNight = new Date(2026, 10, 13, 22, 45, 0);
    assert.equal(formatLocalDateKey(lateNight), '2026-11-13');
  });

  it('sortBlocksChronologically ordena por hora de inicio y parseTimeRange calcula duración', () => {
    const blocks = [
      { id: 'b2', time: '14:30 - 18:00' },
      { id: 'b1', time: '08:30 - 12:00' },
      { id: 'b3', time: '12:00 - 12:30' }
    ];
    const sorted = sortBlocksChronologically(blocks);
    assert.deepEqual(sorted.map(b => b.id), ['b1', 'b3', 'b2']);
    assert.equal(parseTimeRange('08:30 - 12:00').durationMin, 210);
  });

  it('detectBlockConflicts detecta cruces horarios en mismo rol y sede compatible', () => {
    const blocks = [
      { id: 'a', roleCategory: 'gerente', sede: 'Lima', time: '09:00 - 11:00', type: 'Foco' },
      { id: 'b', roleCategory: 'gerente', sede: 'Todas', time: '10:30 - 12:00', type: 'Deadline' },
      { id: 'c', roleCategory: 'oficina', sede: 'Lima', time: '09:00 - 11:00', type: 'Foco' },
      { id: 'd', roleCategory: 'gerente', sede: 'Quito', time: '09:30 - 10:30', type: 'Reunion' }
    ];
    const conflicts = detectBlockConflicts(blocks);
    assert.equal(conflicts.has('a'), true);
    assert.equal(conflicts.has('b'), true);
    assert.equal(conflicts.has('c'), false);
    assert.equal(conflicts.has('d'), false);
  });

  it('getBlockLiveStatus distingue en curso, próximo y finalizado en el día actual', () => {
    const today = new Date(2026, 10, 13, 10, 15, 0);
    assert.equal(getBlockLiveStatus({ time: '09:00 - 11:00' }, today, today), 'active');
    assert.equal(getBlockLiveStatus({ time: '11:30 - 13:00' }, today, today), 'upcoming');
    assert.equal(getBlockLiveStatus({ time: '07:00 - 09:00' }, today, today), 'done');
  });

  it('filterCalendarEventsBySede filtra por sede respetando eventos globales', () => {
    const events = [
      { nombre: 'CAPITULO UNO', sede: 'Lima' },
      { nombre: 'CAPITULO DOS', sede: 'Quito' },
      { nombre: 'Alineación Global', sede: 'Global' }
    ];
    const limaOnly = filterCalendarEventsBySede(events, 'Lima');
    assert.deepEqual(limaOnly.map(e => e.nombre), ['CAPITULO UNO', 'Alineación Global']);
  });

  it('summarizeDayTimeBoxing y mergeCustomAndMasterBlocks calculan carga y conservan personalizados', () => {
    const master = [{ id: 'sch-l1', title: 'Master', time: '08:00 - 10:00', type: 'Deadline', roleCategory: 'gerente', sede: 'Todas' }];
    const stored = [
      { id: 'sch-l1', title: 'Old Master', time: '08:00 - 09:00' },
      { id: 'sch-custom-1', title: 'Llamada VIP', time: '09:30 - 11:00', type: 'Reunion', roleCategory: 'gerente', sede: 'Lima' }
    ];
    const merged = mergeCustomAndMasterBlocks(master, stored);
    assert.equal(merged.length, 2);
    assert.equal(merged.find(b => b.id === 'sch-l1').title, 'Master');
    assert.equal(merged.find(b => b.id === 'sch-custom-1').title, 'Llamada VIP');

    const summary = summarizeDayTimeBoxing(merged);
    assert.equal(summary.totalBlocks, 2);
    assert.equal(summary.hoursLabel, '3h 30m');
    assert.equal(summary.deadlines, 1);
    assert.equal(summary.conflictCount, 2);
  });

  it('getWeekDaysMondayToSunday devuelve exactamente 7 días de Lunes a Domingo', () => {
    const friday = new Date(2026, 10, 13); // Viernes 13 nov 2026
    const week = getWeekDaysMondayToSunday(friday);
    assert.equal(week.length, 7);
    assert.equal(formatLocalDateKey(week[0]), '2026-11-09'); // Lunes
    assert.equal(formatLocalDateKey(week[6]), '2026-11-15'); // Domingo
  });
});
