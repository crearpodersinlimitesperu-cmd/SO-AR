import assert from 'node:assert/strict';
import test from 'node:test';
import { nextUsersPageUrl, rowsToUsers, summarizeNodusUsers } from '../scripts/nodusUserAccessAgent.mjs';

test('maps account fields from visible headers and excludes credentials/actions', () => {
  const users = rowsToUsers(
    ['Usuario', 'Rol', 'Últ. conexión', 'Contraseña', 'Acciones'],
    [['ana', 'Gerente', '2026-10-06 09:15', 'hidden', 'Editar']]
  );
  assert.deepEqual(users, [{
    Usuario: 'ana',
    Rol: 'Gerente',
    'Últ. conexión': '2026-10-06 09:15'
  }]);
});

test('reports only last-connection and account-status fields actually present', () => {
  const summary = summarizeNodusUsers([
    { Usuario: 'ana', 'Últ. conexión': '2026-10-06', Estado: 'Activo' },
    { Usuario: 'bea', 'Últ. conexión': '', Estado: 'Inactivo' }
  ]);
  assert.equal(summary.accountCount, 2);
  assert.equal(summary.lastConnectionColumn, 'Últ. conexión');
  assert.equal(summary.accountsWithLastConnection, 1);
  assert.equal(summary.accountsWithoutLastConnection, 1);
  assert.deepEqual(summary.statusCounts, { Activo: 1, Inactivo: 1 });
});

test('does not invent last connection metrics when NODUS does not expose that field', () => {
  const summary = summarizeNodusUsers([{ Usuario: 'ana', Rol: 'Gerente' }]);
  assert.equal(summary.lastConnectionColumn, null);
  assert.equal(summary.accountsWithLastConnection, null);
  assert.equal(summary.accountsWithoutLastConnection, null);
});

test('follows only explicit same-route next-page links and flags unknown pagination', () => {
  assert.deepEqual(nextUsersPageUrl({ paginationDetected: false }, 'https://imo.crearpslglobal.com/usuarios'), {
    nextUrl: null, complete: true
  });
  assert.deepEqual(nextUsersPageUrl({
    paginationDetected: true,
    nextHref: 'https://imo.crearpslglobal.com/usuarios?pagina=2',
    nextDisabled: false
  }, 'https://imo.crearpslglobal.com/usuarios'), {
    nextUrl: 'https://imo.crearpslglobal.com/usuarios?pagina=2',
    complete: false
  });
  assert.deepEqual(nextUsersPageUrl({ paginationDetected: true, nextHref: null, nextDisabled: false }, 'https://imo.crearpslglobal.com/usuarios'), {
    nextUrl: null, complete: false
  });
  assert.equal(nextUsersPageUrl({
    paginationDetected: true,
    nextHref: 'https://imo.crearpslglobal.com/usuarios/edit/22',
    nextDisabled: false
  }, 'https://imo.crearpslglobal.com/usuarios').complete, false);
});
