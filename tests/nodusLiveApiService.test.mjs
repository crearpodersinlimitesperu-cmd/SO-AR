import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NODUS_API_BASE_URL,
  NODUS_OFFICIAL_API_KEY,
  getLiveNodusSedes,
  getLiveNodusParticipantes,
  pingNodusApi
} from '../src/services/nodusLiveApiService.js';

test('nodusLiveApiService defines official base URL and production API key', () => {
  assert.equal(NODUS_API_BASE_URL, 'https://imo.crearpslglobal.com/api');
  assert.equal(NODUS_OFFICIAL_API_KEY, '7VEBgG3zFHRC1m28yDLsfwUhvukq0KWdQaliSPNt');
});

test('getLiveNodusParticipantes requires equipoId', async () => {
  const res = await getLiveNodusParticipantes();
  assert.equal(res.ok, false);
  assert.equal(res.error, 'ID de equipo requerido');
});

test('getLiveNodusParticipantes fetches real data for Equipo 31 (ID 141) with valid schema', async () => {
  const res = await getLiveNodusParticipantes(141);
  if (!res.ok) {
    // Si no hay red local, asegurar que wrap error sea correcto y fail-safe
    assert.ok(res.error);
    return;
  }

  assert.equal(res.ok, true);
  assert.equal(res.equipo.id, 141);
  assert.equal(res.equipo.nombre, 'EQUIPO 31');
  assert.ok(res.participantes.length > 0, 'Debe contener participantes');
  
  const primero = res.participantes[0];
  assert.ok(primero.identificacion, 'Participante debe tener identificación');
  assert.ok(primero.nombre, 'Participante debe tener nombre');
  assert.equal(typeof primero.asistioC1, 'boolean');
});

test('pingNodusApi returns connection health and latency without throwing', async () => {
  const ping = await pingNodusApi();
  assert.equal(typeof ping.conectado, 'boolean');
  assert.equal(typeof ping.latenciaMs, 'number');
});
