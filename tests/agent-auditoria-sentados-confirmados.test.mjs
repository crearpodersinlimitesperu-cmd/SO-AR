import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normStr,
  inferSedeFromTeamName,
  inferStageFromTeamName,
  extractTeamNumber,
  reconcileTeamAttendance,
  buildCoordinatorTeamMap
} from '../scripts/agentAuditoriaSentadosConfirmados.mjs';

describe('AgentAuditoriaSentadosConfirmados', () => {
  it('correctly normalizes strings and infers sede and stage', () => {
    assert.equal(inferSedeFromTeamName('EQUIPO 32 — LIMA CICLO 1 ✓'), 'Lima');
    assert.equal(inferSedeFromTeamName('EQUIPO 130 — QUITO CICLO 1'), 'Quito');
    assert.equal(inferSedeFromTeamName('EQUIPO 20 — MEDELLÍN CICLO 1'), 'Medellín');
    assert.equal(inferSedeFromTeamName('EQUIPO 38 — GUAYAQUIL CICLO 1'), 'Guayaquil');
    assert.equal(inferSedeFromTeamName('EQUIPO 23 — CUENCA CICLO 1'), 'Cuenca');
    assert.equal(inferSedeFromTeamName('EQUIPO 9 — MÉXICO CICLO 1'), 'México');

    assert.equal(inferStageFromTeamName('EQUIPO 32 — LIMA CICLO 1'), 'C1');
    assert.equal(inferStageFromTeamName('EQUIPO 32 — LIMA CAPITULO 2'), 'C2');
    assert.equal(inferStageFromTeamName('EQUIPO 14 — CICLO 2'), 'C2');

    assert.equal(extractTeamNumber('EQUIPO 32 — LIMA CICLO 1'), 32);
    assert.equal(extractTeamNumber('EQUIPO 130'), 130);
  });

  it('accurately reconciles granular participants distinguishing Nuevos from Rezagados', () => {
    const mockParticipants = [
      // Nuevos: Confirmados y sentados
      { id: 'p1', nombres: 'Carlos', apellidos: 'Perez', llamada1: 'CONFIRMADO', reportAttendanceC1: true },
      { id: 'p2', nombres: 'Ana', apellidos: 'Gomez', llamada2: 'CONFIRMADO', reportAttendanceC1: true },
      // Nuevos: Confirmado que NO asistió (No-Show)
      { id: 'p3', nombres: 'Luis', apellidos: 'Soto', llamada1: 'CONFIRMADO', reportAttendanceC1: false },
      // Nuevos: Sin confirmar que SÍ asistió (Walk-in)
      { id: 'p4', nombres: 'Maria', apellidos: 'Rojas', llamada1: 'NO CONTESTA', reportAttendanceC1: true },
      // Rezagados: Confirmado y sentado
      { id: 'p5', nombres: 'Elena', apellidos: 'Ruiz', llamada1: 'CONFIRMADO', finDeSemana: 'REZAGADO E30', reportAttendanceC1: true },
      // Rezagados: No confirmado pero sentado en sala (acreditación en puerta)
      { id: 'p6', nombres: 'Pedro', apellidos: 'Diaz', llamada1: '—', categoria: 'Rezagado Acreditado en Sala', reportAttendanceC1: true },
      // Rezagados: Confirmado que no llegó (No-Show rezagado)
      { id: 'p7', nombres: 'Rosa', apellidos: 'Lima', llamada1: 'CONFIRMADO', finDeSemana: 'REZAGADOS', reportAttendanceC1: false }
    ];

    const result = reconcileTeamAttendance({
      equipoId: '149',
      equipoNombre: 'EQUIPO 32 — LIMA CICLO 1',
      sede: 'Lima',
      stage: 'C1',
      participantes: mockParticipants
    });

    assert.equal(result.origenDatos, 'GRANULAR_PARTICIPANTES');
    assert.equal(result.metricas.totalAsignados, 7);
    
    // Nuevos
    assert.equal(result.metricas.nuevos.total, 4);
    assert.equal(result.metricas.nuevos.confirmados, 3); // p1, p2, p3
    assert.equal(result.metricas.nuevos.sentados, 3);    // p1, p2, p4
    assert.equal(result.metricas.nuevos.noShows, 1);     // p3
    assert.equal(result.metricas.nuevos.walkIns, 1);     // p4
    assert.equal(result.metricas.nuevos.tasaAsistencia, 100); // 3 sentados / 3 confirmados = 100%

    // Rezagados
    assert.equal(result.metricas.rezagados.total, 3);
    assert.equal(result.metricas.rezagados.confirmados, 2); // p5, p7
    assert.equal(result.metricas.rezagados.sentados, 2);    // p5, p6
    assert.equal(result.metricas.rezagados.noShows, 1);     // p7
    assert.equal(result.metricas.rezagados.walkIns, 1);     // p6
    assert.equal(result.metricas.rezagados.tasaAsistencia, 100); // 2 sentados / 2 confirmados = 100%

    // Totales y desviaciones
    assert.equal(result.metricas.totalConfirmados, 5); // 3 nuevos + 2 rezagados
    assert.equal(result.metricas.totalSentados, 5);    // 3 nuevos + 2 rezagados
    assert.equal(result.metricas.totalNoShows, 2);     // p3 + p7
    assert.equal(result.metricas.totalWalkIns, 2);     // p4 + p6
    assert.equal(result.metricas.tasaFuga, 40);        // 2 no-shows / 5 confirmados = 40%

    // Lista de hallazgos
    assert.equal(result.hallazgos.noShows.length, 2);
    assert.equal(result.hallazgos.walkIns.length, 2);
  });

  it('builds coordinator team map correctly aggregating calls and confirmations', () => {
    const mockCoordinadores = [
      {
        nombre: 'JOYCE',
        sede: 'Lima',
        equipos: [
          { equipo: 'EQUIPO 32', llamadas: 122, confirmado: 47, asistieron: 37, fase: 'C1' },
          { equipo: 'EQUIPO 117', llamadas: 2, confirmado: 0, asistieron: 0, fase: 'C1' }
        ]
      },
      {
        nombre: 'DIANA',
        sede: 'Lima',
        equipos: [
          { equipo: 'EQUIPO 32', llamadas: 82, confirmado: 41, asistieron: 30, fase: 'C1' }
        ]
      }
    ];

    const map = buildCoordinatorTeamMap(mockCoordinadores);
    const e32 = map.get('Lima_C1_32');
    
    assert.ok(e32);
    assert.equal(e32.llamadasTotal, 204);
    assert.equal(e32.confirmadosTotal, 88);
    assert.equal(e32.sentadosCoordTotal, 67);
    assert.equal(e32.coordinadores.length, 2);
  });

  it('handles cross-reconciliation when only summary and coordinator calls are available', () => {
    const summary = {
      equipoId: '149',
      equipoNombre: 'EQUIPO 32 — LIMA CICLO 1 ✓',
      totalParticipantes: 149,
      asistieron: 96,
      confirmadosLlamada: 89,
      rezagados: 13
    };

    const coordMetrics = {
      confirmadosTotal: 88,
      sentadosCoordTotal: 67,
      coordinadores: [{ nombre: 'JOYCE', confirmados: 47 }, { nombre: 'DIANA', confirmados: 41 }]
    };

    const reconciled = reconcileTeamAttendance({
      equipoId: '149',
      equipoNombre: 'EQUIPO 32 — LIMA CICLO 1 ✓',
      sede: 'Lima',
      stage: 'C1',
      summary,
      coordMetrics
    });

    assert.equal(reconciled.metricas.totalAsignados, 149);
    assert.equal(reconciled.metricas.totalConfirmados, 88); // usa el dato real de coordinadores (88)
    assert.equal(reconciled.metricas.totalSentados, 96);    // aforo de sala Nodus
    assert.equal(reconciled.metricas.totalNoShows, 21);     // 88 confirmados - 67 asistentes de su lista = 21
    assert.equal(reconciled.metricas.totalWalkIns, 8);      // 96 sentados - 88 confirmados = 8 walk-ins netos
    assert.equal(reconciled.metricas.tasaFuga, 24);         // 21 / 88 = 24% tasa de fuga
  });
});
