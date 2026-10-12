import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { readFileSync } from 'node:fs';
import { readNodusC1Report } from '../nodusC1Report.mjs';

const headers = ['', 'Acciones', 'Pago', 'Asistencia', 'Desertor', 'Apellidos', 'Nombres',
  'Nombre Preferido', 'Teléfono', 'Coordinador', 'IMO', 'Fin de Semana IMO', 'Teléfono IMO', '1ra Llamada', '2da Llamada'];
function fixture({ selected = '149', serverSide = false, total = 121, count = 121, reordered = false, missingState = false, invalidSchema = false, invalidId = false } = {}) {
  const names = reordered ? [...headers].reverse() : headers;
  const labels = invalidSchema ? names.map(h => h === 'IMO' ? 'Invitador nuevo' : h) : names;
  const values = { Pago: 'Sin pago', Apellidos: 'Synthetic Surname', Nombres: 'Synthetic Person',
    IMO: 'Synthetic Inviter', Coordinador: 'Synthetic Coordinator', Teléfono: '0000000',
    Asistencia: '—', Desertor: '—', '1ra Llamada': '', '2da Llamada': '' };
  const rows = Array.from({ length: count }, (_, i) => ({
    querySelector: () => ({ value: String(i + 1),
      getAttribute: () => JSON.stringify({ id: invalidId ? 'wrong' : i + 1 }) }),
    cells: names.map(h => ({
    textContent: values[h] || '',
    querySelector: () => !missingState && ['Asistencia', 'Desertor'].includes(h) ? { checked: false } : null,
  })) }));
  const table = { querySelectorAll: () => labels.map(textContent => ({ textContent })) };
  const dt = { settings: () => [{ oFeatures: { bServerSide: serverSide } }],
    rows: () => ({ nodes: () => ({ toArray: () => rows }) }), page: { info: () => ({ recordsTotal: total }) } };
  const jQuery = () => ({ DataTable: () => dt });
  jQuery.fn = { dataTable: { isDataTable: () => true } };
  return { document: { querySelector: selector => selector.startsWith('select') ? { value: selected } : table }, window: { jQuery } };
}
const run = options => runInNewContext(`(${readNodusC1Report.toString()})('149')`, fixture(options));

test('C1 extraction uses labeled columns, not changed positions, and all client rows', () => {
  for (const reordered of [false, true]) {
    const rows = run({ reordered });
    assert.equal(rows.length, 121);
    assert.equal(rows[0].nombres, 'Synthetic Person');
    assert.equal(rows[0].imo, 'Synthetic Inviter');
    assert.equal(rows[0].pago, 'Sin pago');
    assert.equal(rows[0].reportAttendanceC1, false);
    assert.equal(rows[0].nodusParticipantId, '1');
    assert.equal('asistio_c1' in rows[0], false);
  }
});
test('wrong team, incomplete/server-side source and absent checkbox fail closed', () => {
  for (const options of [{ selected: '141' }, { serverSide: true }, { count: 25 }, { missingState: true },
    { invalidSchema: true }, { total: 0, count: 0 }, { invalidId: true }]) {
    assert.throws(() => run(options));
  }
});
test('empty candidate notice describes Causa projection rather than claiming Nodus is empty', () => {
  const source = readFileSync(new URL('../../src/features/imo/CampaignGenerator.jsx', import.meta.url), 'utf8');
  assert.match(source, /registros sincronizados de Causa OS/);
  assert.doesNotMatch(source, /Nodus todavía no registra enrolados/);
});
