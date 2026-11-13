import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSearchText,
  tokenizeSearchQuery,
  matchesAllTokens,
  searchUserTasks,
  searchUserEvents
} from '../src/utils/causaGlobalSearch.js';

describe('causaGlobalSearch: búsqueda profunda por espacio, rol y sede sin acentos', () => {
  it('tokenizeSearchQuery y matchesAllTokens normalizan acentos y combinan tokens', () => {
    const tokens = tokenizeSearchQuery('jose sanchez lima');
    assert.deepEqual(tokens, ['jose', 'sanchez', 'lima']);
    assert.equal(matchesAllTokens('José Luis Sánchez • Lima', tokens), true);
    assert.equal(matchesAllTokens('José Luis Sánchez • Quito', tokens), false);
    assert.equal(normalizeSearchText('Auditoría'), 'auditoria');
  });

  it('searchUserTasks busca dentro de tareas del espacio y rol respetando sede y privacidad', () => {
    const currentUser = { email: 'coord@crearpsl.net', appRole: 'coord_c1', roles: ['coord_c1'], sede: 'Lima' };
    const tasks = [
      { id: 'cc1y2_c2_1_b', role: 'coord_c1', cyclePhase: 'C2', task: 'Confirmar salón y baúl C2', sede: 'Lima' },
      { id: 'cc1y2_c2_1_b_quito', role: 'coord_c1', cyclePhase: 'C2', task: 'Confirmar salón Quito', sede: 'Quito' },
      { id: 't3', role: 'gerente', cyclePhase: 'POST-MJ', task: 'Auditoría privada', assignedToEmails: ['otro@crearpsl.net'], sede: 'Lima' }
    ];
    const hits = searchUserTasks({ allTasks: tasks, currentUser, tokens: tokenizeSearchQuery('salon baul') });
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, 'cc1y2_c2_1_b');
  });

  it('searchUserEvents filtra eventos por la sede del usuario salvo directorio global', () => {
    const currentUser = { email: 'coord@crearpsl.net', appRole: 'coord_c1', sede: 'Lima' };
    const events = [
      { id: 'e1', nombre: 'CAMINATA SOBRE FUEGO', sede: 'Lima', equipo: '33', fecha_inicio: '2027-03-04' },
      { id: 'e2', nombre: 'CAMINATA SOBRE FUEGO', sede: 'Quito', equipo: '126', fecha_inicio: '2027-03-11' }
    ];
    const hits = searchUserEvents({ events, currentUser, canSeeGlobalDirectory: false, tokens: tokenizeSearchQuery('caminata fuego') });
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, 'e1');
  });
});
