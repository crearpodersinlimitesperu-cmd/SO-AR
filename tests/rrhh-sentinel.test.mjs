import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyCoordinatorPerformance,
  getCoordinatorMetrics,
  isSnapshotFresh,
  resolveUniqueNameMatch
} from '../shared/rrhhSentinelRules.mjs';
import { NodusHrSentinelAgent } from '../scripts/nodusHrSentinelAgent.mjs';
import { NodusIdentityAgent } from '../scripts/nodusIdentityAgent.mjs';

class MemoryFirestore {
  constructor() {
    this.collections = new Map();
  }

  collection(name) {
    if (!this.collections.has(name)) this.collections.set(name, new Map());
    const documents = this.collections.get(name);
    return {
      doc: id => ({
        id,
        collectionName: name,
        get: async () => ({ exists: documents.has(id), data: () => documents.get(id) }),
        set: async (data, options = {}) => documents.set(id, options.merge
          ? { ...documents.get(id), ...data }
          : data)
      })
    };
  }

  async runTransaction(callback) {
    const creates = [];
    const transaction = {
      get: async ref => {
        const documents = this.collections.get(ref.collectionName);
        return { exists: Boolean(documents?.has(ref.id)) };
      },
      create: (ref, data) => creates.push({ ref, data })
    };
    const result = await callback(transaction);
    for (const { ref, data } of creates) {
      const documents = this.collections.get(ref.collectionName);
      if (documents.has(ref.id)) throw new Error(`Already exists: ${ref.id}`);
      documents.set(ref.id, data);
    }
    return result;
  }
}

test('no vincula una identidad parcial ambigua y permite una sede que desambigua', () => {
  const entries = [
    { name: 'María López', sede: 'Lima' },
    { name: 'María Torres', sede: 'Quito' }
  ];

  assert.equal(resolveUniqueNameMatch('Maria', entries), null);
  assert.equal(resolveUniqueNameMatch('Maria', entries, { sede: 'Quito' }), entries[1]);
  assert.equal(resolveUniqueNameMatch('Maria Lopez', entries), entries[0]);
  assert.equal(resolveUniqueNameMatch('María López', [entries[0], { ...entries[0] }]), null);
});

test('preserva ceros explícitos y no convierte métricas ausentes en ceros', () => {
  const metrics = getCoordinatorMetrics({ asignados: 20, gestiones: 0, estados: { noContesta: 0 } });
  assert.equal(metrics.asignados, 20);
  assert.equal(metrics.gestiones, 0);
  assert.equal(metrics.coberturaPct, 0);
  assert.equal(metrics.noContesta, 0);
  assert.equal(metrics.confirmados, null);
  assert.equal(metrics.sentadosTotal, null);
  assert.equal(metrics.porConfirmar, null);
});

test('respeta la disponibilidad declarada por el extractor aunque mantenga ceros por compatibilidad', () => {
  const coordinator = {
    asignados: 0,
    gestiones: 0,
    coberturaPct: 0,
    estados: { noContesta: 0 },
    metricasDisponibles: {
      asignados: false,
      gestiones: false,
      coberturaPct: false,
      noContesta: false
    }
  };
  const metrics = getCoordinatorMetrics(coordinator);
  assert.equal(metrics.asignados, null);
  assert.equal(metrics.gestiones, null);
  assert.equal(metrics.coberturaPct, null);
  assert.equal(metrics.noContesta, null);
  assert.equal(classifyCoordinatorPerformance(coordinator).nivelRiesgo, 'INDETERMINADO');
});

test('conserva coberturas reportadas por encima de 100%', () => {
  const metrics = getCoordinatorMetrics({
    asignados: 20,
    gestiones: 30,
    coberturaPct: 125
  });
  assert.equal(metrics.coberturaPct, 125);
  assert.equal(metrics.coberturaOrigen, 'nodus');
  assert.equal(getCoordinatorMetrics({ asignados: 20, gestiones: 10 }).coberturaOrigen, 'calculada');
});

test('clasifica solo con métricas necesarias y aparta coordinadores sin base', () => {
  assert.equal(classifyCoordinatorPerformance({ asignados: 0 }).nivelRiesgo, 'SIN_BASE');
  assert.equal(classifyCoordinatorPerformance({ asignados: 10 }).nivelRiesgo, 'INDETERMINADO');
  assert.equal(classifyCoordinatorPerformance({ asignados: 20, gestiones: 10 }).nivelRiesgo, 'MEDIO');
  assert.equal(
    classifyCoordinatorPerformance({ asignados: 10, gestiones: 10, noContesta: 7 }).nivelRiesgo,
    'MEDIO'
  );
  assert.equal(
    classifyCoordinatorPerformance({ asignados: 10, gestiones: 10, noContesta: 6 }).nivelRiesgo,
    'OPTIMO'
  );
  assert.equal(
    classifyCoordinatorPerformance({ asignados: 20, gestiones: 0 }).nivelRiesgo,
    'CRITICO'
  );
  assert.equal(
    classifyCoordinatorPerformance({ asignados: 10, gestiones: 10 }).nivelRiesgo,
    'OPTIMO'
  );
});

test('considera vigente solo un corte Nodus fechado y no futuro', () => {
  const now = Date.parse('2026-10-07T12:00:00.000Z');
  assert.equal(isSnapshotFresh('2026-10-07T11:00:00.000Z', now), true);
  assert.equal(isSnapshotFresh('2026-10-06T11:59:59.999Z', now), false);
  assert.equal(isSnapshotFresh('2026-10-07T12:00:01.000Z', now), false);
  assert.equal(isSnapshotFresh(null, now), false);
});

test('publicación reutiliza las alertas de un mismo episodio y escapa los datos del correo', async () => {
  const db = new MemoryFirestore();
  const agent = new NodusHrSentinelAgent(db);
  const sourceTimestamp = new Date().toISOString();
  const coordinator = {
    nombre: '<img src=x onerror=alert(1)>',
    sede: 'Lima',
    asignados: 20,
    gestiones: 1,
    noContesta: 0
  };

  const firstReport = agent.diagnosticarDesempeno([coordinator], sourceTimestamp);
  await agent.publicarAlertasYCuadroDeMando(firstReport);
  assert.equal(db.collections.get('notifications').size, 4);
  assert.equal(db.collections.get('mail').size, 1);
  const email = [...db.collections.get('mail').values()][0];
  assert.match(email.message.html, /&lt;img src=x onerror=alert\(1\)&gt;/);

  const repeatedReport = agent.diagnosticarDesempeno([coordinator], sourceTimestamp);
  await agent.publicarAlertasYCuadroDeMando(repeatedReport);
  assert.equal(db.collections.get('notifications').size, 4);
  assert.equal(db.collections.get('mail').size, 1);
});

test('un corte Nodus vencido se guarda como diagnóstico pero no despacha alertas', async () => {
  const db = new MemoryFirestore();
  const agent = new NodusHrSentinelAgent(db);
  const staleTimestamp = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
  const report = agent.diagnosticarDesempeno([{
    nombre: 'Coordinador de prueba',
    sede: 'Lima',
    asignados: 20,
    gestiones: 1
  }], staleTimestamp);

  await agent.publicarAlertasYCuadroDeMando(report);
  assert.equal(db.collections.get('notifications')?.size || 0, 0);
  assert.equal(db.collections.get('mail')?.size || 0, 0);
  assert.equal(db.collections.get('nodus_hr_sentinel').get('latest').sourceTimestamp, staleTimestamp);
});

test('despacha las alertas críticas primero y no omite las alertas medias', async () => {
  const db = new MemoryFirestore();
  const agent = new NodusHrSentinelAgent(db);
  const report = agent.diagnosticarDesempeno([
    { nombre: 'Coordinador crítico', sede: 'Lima', asignados: 20, gestiones: 1 },
    { nombre: 'Coordinador medio', sede: 'Lima', asignados: 20, gestiones: 10 }
  ], new Date().toISOString());

  await agent.publicarAlertasYCuadroDeMando(report);
  const types = [...db.collections.get('notifications').values()].map(notification => notification.type);
  assert.equal(types.includes('critical'), true);
  assert.equal(types.includes('warning'), true);
});

test('el agente de identidad no resuelve por subcadena y conserva registros no vinculados', async () => {
  const agent = new NodusIdentityAgent();
  agent.fetchMasterRoster = async () => [
    { fullNombre: 'Ana María López', preferido: 'Ana María López', cargo: 'Capitulo 1 y 2', renuncio: false },
    { fullNombre: 'Ana María Torres', preferido: 'Ana María Torres', cargo: 'Capitulo 1 y 2', renuncio: false }
  ];

  const result = await agent.enforceIdentityTruth([
    { nombre: 'Ana' },
    { nombre: 'Ana Maria Lopez' }
  ], 'C1_C2');

  assert.equal(result.length, 2);
  assert.equal(result[0].identityVerified, false);
  assert.equal(result[0].identityStatus, 'NO_UNIQUE_ROSTER_MATCH');
  assert.equal(result[0].nombre, 'Ana');
  assert.equal(result[1].identityVerified, true);
  assert.equal(result[1].nombre, 'Ana María López');
});
