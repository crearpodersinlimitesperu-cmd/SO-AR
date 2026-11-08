import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PROMPT_MAESTRO_AUDITORIA_3_RI,
  GUIA_PROPOSITO_3_CAPAS_RI,
  generarPromptParaParticipante,
  auditarResultadosImposiblesEMPOR,
  generarTextoEvaluacionCompleta
} from './nodusFIAgent.js';

test('PROMPT_MAESTRO_AUDITORIA_3_RI contains the required sections and rules', () => {
  assert.ok(PROMPT_MAESTRO_AUDITORIA_3_RI.includes('PROMPT MAESTRO DE AUDITORÍA: 3 RESULTADOS IMPOSIBLES (NODUS)'));
  assert.ok(PROMPT_MAESTRO_AUDITORIA_3_RI.includes('[ROL Y CONTEXTO]'));
  assert.ok(PROMPT_MAESTRO_AUDITORIA_3_RI.includes('[CRITERIOS DE AUDITORÍA PARA CADA RESULTADO IMPOSIBLE]'));
  assert.ok(PROMPT_MAESTRO_AUDITORIA_3_RI.includes('1. Especificidad y Medición'));
  assert.ok(PROMPT_MAESTRO_AUDITORIA_3_RI.includes('2. Nivel de Desafío ("Imposible")'));
  assert.ok(PROMPT_MAESTRO_AUDITORIA_3_RI.includes('3. Conexión con el Propósito ("Para Qué")'));
  assert.ok(PROMPT_MAESTRO_AUDITORIA_3_RI.includes('EVALUACIÓN DE RESULTADOS IMPOSIBLES (NODUS)'));
  assert.ok(PROMPT_MAESTRO_AUDITORIA_3_RI.includes('PREGUNTA CUÁNTICA DE ENFOQUE:'));
  assert.ok(PROMPT_MAESTRO_AUDITORIA_3_RI.includes('[REGLAS DE TONO Y ESTILO]'));
});

test('GUIA_PROPOSITO_3_CAPAS_RI contains the 3 layers, EMPOR matrix and 4-point checklist', () => {
  assert.ok(GUIA_PROPOSITO_3_CAPAS_RI.titulo.includes('Propósito'));
  assert.equal(GUIA_PROPOSITO_3_CAPAS_RI.paso1.capas.length, 3);
  assert.equal(GUIA_PROPOSITO_3_CAPAS_RI.paso2.tabla.length, 3);
  assert.equal(GUIA_PROPOSITO_3_CAPAS_RI.paso3.items.length, 4);
  assert.ok(GUIA_PROPOSITO_3_CAPAS_RI.textoCompartible.includes('E.M.P.O.R.'));
  assert.ok(GUIA_PROPOSITO_3_CAPAS_RI.textoCompartible.includes('Capa 3'));
});

test('generarPromptParaParticipante formats participant data and goals into prompt', () => {
  const participante = {
    nombre: 'Ana María Valdivia',
    dni: '45892301',
    sede: 'Lima',
    equipo: 'EQUIPO 30',
    fis: [
      { area: 'Finanzas', meta: 'Aumentar mis ingresos a S/ 15,000 al mes antes del 15 de diciembre para comprar mi departamento.' },
      { area: 'Salud', meta: 'Reducir mi porcentaje de grasa al 19% corriendo 10K el 10 de diciembre para modelar vitalidad a mis hijos.' },
      { area: 'Relaciones', meta: 'Tener una cita semanal de calidad con mi pareja durante 12 semanas consecutivas para consolidar nuestro matrimonio.' }
    ]
  };

  const promptGenerado = generarPromptParaParticipante(participante);
  assert.ok(promptGenerado.includes('Ana María Valdivia'));
  assert.ok(promptGenerado.includes('45892301'));
  assert.ok(promptGenerado.includes('EQUIPO 30'));
  assert.ok(promptGenerado.includes('Aumentar mis ingresos a S/ 15,000'));
  assert.ok(promptGenerado.includes('PROMPT MAESTRO DE AUDITORÍA: 3 RESULTADOS IMPOSIBLES (NODUS)'));
});

test('auditarResultadosImposiblesEMPOR approves 3 high standard RIs and uses warm, empowering language', () => {
  const ris = [
    { area: 'Finanzas', meta: 'Facturar $25,000 USD netos antes del 18 de diciembre de 2026 para saldar el 100% de mis deudas y brindar tranquilidad y tiempo libre a mi familia.' },
    { area: 'Salud', meta: 'Reducir mi grasa corporal al 16% y completar la carrera de 10K el 12 de diciembre de 2026 para operar desde la máxima energía y longevidad.' },
    { area: 'Liderazgo', meta: 'Enrolar y graduar a 5 nuevos líderes en el programa antes del 20 de diciembre de 2026 para expandir el impacto transformacional en mi comunidad.' }
  ];

  const resultado = auditarResultadosImposiblesEMPOR(ris, { nombre: 'Carlos Ruiz' });
  assert.equal(resultado.estadoGeneral, 'APROBADO');
  assert.equal(resultado.resultados[0].estado, 'APROBADO');
  assert.equal(resultado.resultados[1].estado, 'APROBADO');
  assert.equal(resultado.resultados[2].estado, 'APROBADO');
  assert.ok(resultado.preguntaCuantica);

  const texto = generarTextoEvaluacionCompleta(resultado);
  assert.ok(texto.includes('ESTADO GENERAL: [APROBADO]'));
  assert.ok(texto.includes('PREGUNTA CUÁNTICA DE ENFOQUE:'));
  // Rule: avoid negative punitive words
  assert.doesNotMatch(texto, /\b(error|malo|fallaste|insuficiente)\b/i);
});

test('auditarResultadosImposiblesEMPOR detects opportunities for precision and guides immediate adjustment', () => {
  const ris = [
    { area: 'Finanzas', meta: 'Quiero tener más dinero y estar tranquilo.' }, // Vague: no numbers, no date, weak purpose
    { area: 'Salud', meta: 'Bajar de peso pronto.' }, // Vague
    { area: 'Paz', meta: '' } // Unpresented
  ];

  const resultado = auditarResultadosImposiblesEMPOR(ris, { nombre: 'Lucía Torres' });
  assert.equal(resultado.estadoGeneral, 'REQUIERE ELEVAR EL ESTÁNDAR');
  assert.equal(resultado.resultados[0].estado, 'REQUIERE ELEVAR EL ESTÁNDAR');
  assert.equal(resultado.resultados[2].estado, 'REQUIERE ELEVAR EL ESTÁNDAR');

  const texto = generarTextoEvaluacionCompleta(resultado);
  assert.ok(texto.includes('ESTADO GENERAL: [REQUIERE ELEVAR EL ESTÁNDAR]'));
  assert.ok(texto.includes('Ajuste Inmediato Sugerido'));
  // Must avoid negative punitive words even when needing adjustments
  assert.doesNotMatch(texto, /\b(error|malo|fallaste|insuficiente)\b/i);
});
