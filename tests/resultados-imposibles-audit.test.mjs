import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  ejecutarAuditoriaResultadosImposibles 
} from '../scripts/agentAuditoriaResultadosImposibles.mjs';
import { 
  evaluarCalidadOntologicaFI, 
  auditarParticipantesEnJuego3Resultados 
} from '../src/services/nodusFIAgent.js';

test('1. Migración Lingüística y Cultural a Resultados Imposibles', () => {
  const evaluacion = evaluarCalidadOntologicaFI(
    'Finanzas',
    'Ingresos Personales',
    'Facturar $15,000 USD mensuales antes del 31 de diciembre de 2026 mediante consultoría estratégica.'
  );

  assert.equal(evaluacion.nivel, 'ALTA');
  assert.equal(evaluacion.etiqueta, 'Resultado Extraordinario (Audaz & SMART)');
  assert.match(evaluacion.observaciones, /Resultado Imposible/i);
  assert.doesNotMatch(evaluacion.observaciones, /Futuro Imposible/i);
});

test('2. Nueva Lógica de Negocio: Exactamente 3 Resultados Imposibles de Alto Estándar', () => {
  const mockParticipantes = [
    {
      id: 'part_01',
      nombre: 'Juan Pérez',
      sede: 'Lima',
      equipo: 'EQUIPO 32',
      asistioPFD: true,
      fis: [
        { area: 'Finanzas', meta: 'Aumentar mis ingresos a $5,000 mensuales en octubre 2026', estado: 'aprobado' },
        { area: 'Salud', meta: 'Correr maratón de 42k en diciembre 2026 con tiempo sub 4 horas', estado: 'aprobado' },
        { area: 'Relaciones', meta: 'Viaje familiar de 15 días en noviembre 2026 con presupuesto de $4,000', estado: 'aprobado' },
        { area: 'Carrera', meta: 'Ascenso a director general en 2027', estado: 'aprobado' }, // 4to histórico
        { area: 'Espiritual', meta: 'Meditar 30 min diarios', estado: 'aprobado' } // 5to histórico
      ]
    },
    {
      id: 'part_02',
      nombre: 'Ana Gómez',
      sede: 'Lima',
      equipo: 'EQUIPO 32',
      asistioPFD: true,
      fis: [
        { area: 'Finanzas', meta: 'Ahorrar más dinero', estado: 'pendiente' },
        { area: 'Salud', meta: 'Bajar de peso', estado: 'devuelto' }
      ]
    }
  ];

  const resultado = auditarParticipantesEnJuego3Resultados(mockParticipantes);
  assert.equal(resultado.totalEnJuego, 2);
  
  // Juan tiene los 3 primeros aprobados -> cumple el estándar de 3 Resultados
  const juan = resultado.participantesAuditados.find(p => p.id === 'part_01');
  assert.equal(juan.cumpleEstandarSuperior, true);
  assert.equal(juan.aprobados3, 3);
  assert.equal(juan.totalResultados3, 3);
  assert.equal(juan.porcentajeCumplimiento, 100);
  assert.equal(juan.rawFis.length, 5, 'Inmutabilidad: los 5 registros históricos se conservan íntegros sin delete');

  // Ana tiene 2 cargados pero ninguno con estándar aprobado -> no cumple
  const ana = resultado.participantesAuditados.find(p => p.id === 'part_02');
  assert.equal(ana.cumpleEstandarSuperior, false);
  assert.equal(ana.aprobados3, 0);
  assert.equal(ana.totalResultados3, 2);
  assert.equal(ana.resultadosImposibles.length, 3, 'El esquema audita exactamente 3 Resultados');
});

test('3. Agente Evaluador IA: Cero Inflación de Métricas y Cruce de Evidencias', () => {
  const mockParticipantes = [
    {
      id: 'part_03',
      nombre: 'Carlos Mendoza',
      sede: 'Quito',
      equipo: 'EQUIPO 35',
      asistioPFD: true,
      fis: [
        { area: 'Finanzas', meta: '', estado: 'no_presentado' },
        { area: 'Salud', meta: '', estado: 'no_presentado' },
        { area: 'Propósito', meta: '', estado: 'no_presentado' }
      ]
    }
  ];

  const auditoria = ejecutarAuditoriaResultadosImposibles(mockParticipantes);
  assert.equal(auditoria.certificadosCompletos, 0);
  assert.equal(auditoria.sinEntrega, 1);
  assert.equal(auditoria.efectividadGlobal, 0);
  assert.equal(auditoria.informeEjecutivo.reglaNegocio, '3 Resultados Imposibles de estándar superior por participante en juego');
  assert.ok(auditoria.informeEjecutivo.hallazgosCriticos.length > 0);
});
