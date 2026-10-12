// Self-contained for execution inside the authorized browser page.
export function readNodusC1Report(expectedTeamId) {
  if (document.querySelector('select[name="id_equipo"]')?.value !== String(expectedTeamId)) {
    throw new Error('Report team filter mismatch');
  }
  const table = document.querySelector('#tblReporteC1');
  if (!table) throw new Error('C1 report unavailable');
  const key = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  const headers = Array.from(table.querySelectorAll('thead th')).map(h => key(h.textContent));
  const columns = {
    apellidos: 'apellidos', nombres: 'nombres', nombrePreferido: 'nombre preferido',
    telefono: 'telefono', coordinador: 'coordinador', imo: 'imo', telefonoImo: 'telefono imo',
    llamada1: '1ra llamada', llamada2: '2da llamada', finDeSemana: 'fin de semana imo',
    asistencia: 'asistencia', desertor: 'desertor', pago: 'pago',
  };
  if (Object.values(columns).some(label => headers.filter(h => h === label).length !== 1)) {
    throw new Error('C1 report schema changed');
  }
  if (!window.jQuery?.fn?.dataTable?.isDataTable(table)) throw new Error('Complete C1 report unverified');
  const dt = window.jQuery(table).DataTable();
  if (dt.settings()[0].oFeatures.bServerSide) throw new Error('Server-side C1 report unverified');
  const nodes = Array.from(dt.rows().nodes().toArray());
  if (!nodes.length) throw new Error('Empty C1 report requires review before publication');
  if (nodes.length !== dt.page.info().recordsTotal) throw new Error('Incomplete C1 report');
  return nodes.map(row => {
    const cells = Array.from(row.cells);
    if (cells.length !== headers.length) throw new Error('Malformed C1 report row');
    const result = Object.fromEntries(Object.entries(columns).map(([field, label]) =>
      [field, cells[headers.indexOf(label)].textContent.trim()]));
    const identity = row.querySelector('.chk-pago-c1');
    if (identity) {
      let info;
      try { info = JSON.parse(identity.getAttribute('data-info') || '{}'); }
      catch { throw new Error('C1 report identity invalid'); }
      if (!/^\d+$/.test(identity.value) || String(info.id) !== identity.value) {
        throw new Error('C1 report identity mismatch');
      }
      result.nodusParticipantId = identity.value;
    }
    // Source checkbox state is retained separately from IMO intention/call checks.
    for (const [label, field] of [['asistencia', 'reportAttendanceC1'], ['desertor', 'reportDropoutC1']]) {
      const checkbox = cells[headers.indexOf(label)].querySelector('input[type="checkbox"]');
      if (!checkbox) throw new Error('C1 report state unverified');
      result[field] = checkbox.checked;
    }

    return result;
  });
}

export async function waitForC1Report(page) {
  await page.waitForFunction(() => {
    const table = document.querySelector('#tblReporteC1');
    return !!table && !!window.jQuery?.fn?.dataTable?.isDataTable(table);
  }, { timeout: 30000 });
}
