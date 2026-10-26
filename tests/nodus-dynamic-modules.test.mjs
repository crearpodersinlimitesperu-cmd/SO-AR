import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeNodusPath,
  discoverNodusSidebarModules,
  KNOWN_NODUS_MODULES
} from '../scripts/nodusDynamicModulesAgent.mjs';
import { queryNodusAssistant } from '../src/services/nodusLiveSyncService.js';
import { createNodusApiClient, NodusApiError } from '../cloudflare-worker/src/nodusApiClient.js';

test('normalizeNodusPath normalizes relative and absolute URLs safely and discards malicious/auth routes', () => {
  assert.equal(normalizeNodusPath('https://imo.crearpslglobal.com/aliados'), '/aliados');
  assert.equal(normalizeNodusPath('https://imo.crearpslglobal.com/aliados/'), '/aliados');
  assert.equal(normalizeNodusPath('https://imo.crearpslglobal.com/contabilidad?tab=1'), '/contabilidad');
  assert.equal(normalizeNodusPath('/mesaregistro'), '/mesaregistro');
  assert.equal(normalizeNodusPath('/juniors/'), '/juniors');

  // Ignorar rutas no seguras o de salida
  assert.equal(normalizeNodusPath('https://imo.crearpslglobal.com/auth/login'), null);
  assert.equal(normalizeNodusPath('https://imo.crearpslglobal.com/logout'), null);
  assert.equal(normalizeNodusPath('javascript:void(0)'), null);
  assert.equal(normalizeNodusPath('https://attacker.example/aliados'), null);
  assert.equal(normalizeNodusPath('https://imo.crearpslglobal.com/sgcaptcha'), null);
});

test('discoverNodusSidebarModules identifies known modules and dynamically indexes newly created sidebar links', async () => {
  const fakePage = {
    evaluate: async () => [
      { href: 'https://imo.crearpslglobal.com/aliados', text: 'Aliados', parentSection: 'SEGUIMIENTO' },
      { href: 'https://imo.crearpslglobal.com/contabilidad', text: 'Contabilidad', parentSection: 'SISTEMA' },
      { href: 'https://imo.crearpslglobal.com/mesaregistro', text: 'Mesa Registro', parentSection: 'SEGUIMIENTO' },
      { href: 'https://imo.crearpslglobal.com/nuevo_modulo_2026', text: 'Nuevo Módulo Auditoría 2026', parentSection: 'INNOVACIÓN' }
    ]
  };

  const catalog = await discoverNodusSidebarModules(fakePage);
  assert.ok(catalog.length >= KNOWN_NODUS_MODULES.length);

  const aliadosMod = catalog.find(m => m.path === '/aliados');
  assert.ok(aliadosMod);
  assert.equal(aliadosMod.section, 'SEGUIMIENTO');

  // Verificar que el nuevo módulo no catalogado fue detectado y clasificado como dinámico
  const nuevoMod = catalog.find(m => m.path === '/nuevo_modulo_2026');
  assert.ok(nuevoMod, 'El nuevo módulo debe ser indexado automáticamente sin tocar código');
  assert.equal(nuevoMod.title, 'Nuevo Módulo Auditoría 2026');
  assert.equal(nuevoMod.section, 'INNOVACIÓN');
  assert.equal(nuevoMod.category, 'dinamico_detectado');
  assert.equal(nuevoMod.isKnown, false);
});

test('queryNodusAssistant processes financial and conversion queries without delay or hallucination', async () => {
  const resFinanzas = await queryNodusAssistant('cuantos pagos cerraron en c1 32', {
    contabilidad: {
      metricas: {
        pagosCerrados: 134,
        montoRecaudado: 'PEN 92,985.00',
        pagosPendientes: 0,
        totalParticipantes: 149,
        asistieronC1: 96,
        pasaronC2: 24,
        pagaronC2: 18,
        pagaronC2MJ: 6,
        abonos: 11
      }
    }
  });

  assert.ok(resFinanzas.response.includes('134'));
  assert.ok(resFinanzas.response.includes('PEN 92,985.00'));
  assert.ok(resFinanzas.response.includes('Equipo 32'));

  const resAliados = await queryNodusAssistant('cuantos pasaron a c2');
  assert.ok(resAliados.response.includes('96'));
  assert.ok(resAliados.response.includes('24'));
  assert.ok(resAliados.response.includes('18'));
  assert.ok(resAliados.response.includes('17'));
});

test('nodusApiClient supports new dynamic module endpoints (/aliados, /contabilidad, /mesaregistro, /juniors, /modulos)', async () => {
  const record = {};
  const mockFetch = async (url, init) => {
    record.url = new URL(url);
    record.init = init;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        data: [{ id: 149, metrics: { totalPersonas: 96 } }],
        meta: { generado: '2026-10-26T12:00:00Z', total: 1 }
      })
    };
  };

  const client = createNodusApiClient({
    apiKey: 'test-api-key',
    fetchImpl: mockFetch,
    now: () => Date.parse('2026-10-26T12:05:00Z')
  });

  // 1. getAliados con equipoId
  const aliadosRes = await client.getAliados({ equipoId: 149 });
  assert.equal(record.url.pathname, '/api/aliados');
  assert.equal(record.url.searchParams.get('id_equipo'), '149');
  assert.equal(aliadosRes.source, 'NODUS_API');
  assert.ok(aliadosRes.data);

  // 2. getContabilidad
  await client.getContabilidad({ sedeId: 7 });
  assert.equal(record.url.pathname, '/api/contabilidad');
  assert.equal(record.url.searchParams.get('id_sede'), '7');

  // 3. getMesaRegistro
  await client.getMesaRegistro({ equipoId: 149 });
  assert.equal(record.url.pathname, '/api/mesaregistro');

  // 4. getJuniors
  await client.getJuniors({ sedeId: 7 });
  assert.equal(record.url.pathname, '/api/juniors');

  // 5. getModulosCatalogo
  await client.getModulosCatalogo();
  assert.equal(record.url.pathname, '/api/modulos');

  // 6. getModuloGenerico
  await client.getModuloGenerico('documentos_especiales');
  assert.equal(record.url.pathname, '/api/documentos_especiales');
});
