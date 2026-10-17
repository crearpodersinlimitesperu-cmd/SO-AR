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
  if (dt.settings()[0]._bInitComplete !== true) throw new Error('C1 report initialization incomplete');
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

export async function waitForC1Report(page, expectedTeamId) {
  await page.waitForFunction(expected => {
    if (document.querySelector('select[name="id_equipo"]')?.value !== String(expected)) return false;
    const table = document.querySelector('#tblReporteC1');
    if (!table || !window.jQuery?.fn?.dataTable?.isDataTable(table)) return false;
    // DataTables registers the table before asynchronous language/Ajax initialization finishes.
    return window.jQuery(table).DataTable().settings()[0]._bInitComplete === true;
  }, { timeout: 30000 }, String(expectedTeamId));
}

// Only enums, booleans and counts cross the browser boundary; never URLs or DOM text.
export function inspectNodusC1Report(expectedTeamId) {
  const route = /captcha|challenge/i.test(location.pathname) ? 'challenge'
    : location.pathname === '/auth/login' ? 'login'
    : location.origin === 'https://imo.crearpslglobal.com' && location.pathname === '/reporte'
      && new URLSearchParams(location.search).get('id_equipo') === String(expectedTeamId) ? 'report' : 'unexpected';
  const select = document.querySelector('select[name="id_equipo"]');
  const table = document.querySelector('#tblReporteC1');
  const jquery = typeof window.jQuery === 'function';
  const dataTables = typeof window.jQuery?.fn?.dataTable?.isDataTable === 'function';
  const registered = !!table && dataTables && window.jQuery.fn.dataTable.isDataTable(table);
  const settings = registered ? window.jQuery(table).DataTable().settings()[0] : null;
  return {
    route,
    teamFilter: !select ? 'missing' : select.value === String(expectedTeamId) ? 'match' : 'mismatch',
    tablePresent: !!table,
    jquery,
    dataTables,
    registered,
    initComplete: settings?._bInitComplete === true,
    serverSide: settings?.oFeatures?.bServerSide === true,
    headerCount: table ? table.querySelectorAll('thead th').length : 0,
  };
}

export async function extractNodusC1Report(page, expectedTeamId, navigate) {
  if (!/^\d+$/.test(String(expectedTeamId))) throw new Error('Invalid C1 team ID');
  const signals = { pageErrors: 0, scriptFailures: 0, dataRequestFailures: 0 };
  const pageError = () => { signals.pageErrors++; };
  const failedRequest = request => {
    const type = request.resourceType();
    if (type === 'script') signals.scriptFailures++;
    if (type === 'xhr' || type === 'fetch') signals.dataRequestFailures++;
  };
  const responseError = response => {
    if (response.status() >= 400) failedRequest(response.request());
  };
  page.on('pageerror', pageError);
  page.on('requestfailed', failedRequest);
  page.on('response', responseError);
  let stage = 'navigation';
  let httpStatus = null;
  try {
    const response = await navigate();
    httpStatus = response?.status() ?? null;
    if (!response?.ok()) throw new Error('C1 report navigation unavailable');
    stage = 'readiness';
    await waitForC1Report(page, expectedTeamId);
    const state = await page.evaluate(inspectNodusC1Report, String(expectedTeamId));
    if (state.route !== 'report') throw new Error('C1 report route mismatch');
    stage = 'extraction';
    return await page.evaluate(readNodusC1Report, String(expectedTeamId));
  } catch (error) {
    let state;
    try {
      state = await page.evaluate(inspectNodusC1Report, String(expectedTeamId));
    } catch {
      state = { inspectionUnavailable: true };
    }
    const reasons = [
      'C1 report navigation unavailable', 'C1 report route mismatch', 'Report team filter mismatch',
      'C1 report unavailable', 'C1 report schema changed', 'Complete C1 report unverified',
      'C1 report initialization incomplete', 'Server-side C1 report unverified',
      'Empty C1 report requires review before publication', 'Incomplete C1 report',
      'Malformed C1 report row', 'C1 report identity invalid', 'C1 report identity mismatch',
      'C1 report state unverified',
    ];
    const reason = reasons.includes(error.message) ? error.message
      : error.name === 'TimeoutError' ? 'C1 report readiness timed out' : 'C1 source unavailable';
    throw new Error('C1_REPORT_FAILED ' + JSON.stringify({
      teamId: String(expectedTeamId), stage, reason, httpStatus, ...signals, ...state,
    }));
  } finally {
    page.off('pageerror', pageError);
    page.off('requestfailed', failedRequest);
    page.off('response', responseError);
  }
}
