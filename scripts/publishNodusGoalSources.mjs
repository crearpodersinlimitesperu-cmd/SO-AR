import puppeteer from 'puppeteer';
import { loginNodusReadOnly, getNodusAdminDb, isNodusVerificationUrl } from './nodusArchiveAgent.mjs';
import { canonicalSede, explicitGoalTeam, explicitTeamFromText, goalStageKey } from '../src/services/goalsTimeline.js';
import { nodusDate, NODUS_GOAL_SOURCE } from '../src/services/nodusGoalSources.js';

async function readPage(page, path) {
  const response = await page.goto(`${NODUS_GOAL_SOURCE}${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  if (new URL(page.url()).origin !== NODUS_GOAL_SOURCE || /\/auth\/login|captcha/i.test(page.url()) ||
      isNodusVerificationUrl(page.url()) || !response || response.status() >= 400) {
    throw new Error(`Nodus no permitió leer ${path.split('?')[0]}; HTTP ${response?.status() ?? 'sin respuesta'}. Consulta detenida.`);
  }
  await page.waitForNetworkIdle({ idleTime: 500, timeout: 10000 });
}

export function parseNodusTeamRows(rows) {
  return rows.flatMap(row => {
    const team = explicitTeamFromText(row.equipo);
    const sede = canonicalSede(row.sede);
    const stage = goalStageKey({ title: String(row.sede).replace(/CICLO\s*([12])/i, 'C$1') });
    const teamId = row.path?.match(/^\/equipos\/detalle\/(\d+)$/)?.[1];
    if (!team || !sede || !teamId || !['C1', 'C2'].includes(stage)) return [];
    return [{ team, sede, stage, teamId, start: nodusDate(row.start), end: nodusDate(row.end), path: row.path }];
  });
}

export function parseAllyHeadings(headings, team) {
  const metrics = [
    ['assignedAllies', 'C1', /^Aliados Asignados\s*\((\d+)\)/i],
    ['confirmedC2Allies', 'C2', /^Aliados Confirmados para C2\s*\((\d+)\)/i]
  ];
  return metrics.flatMap(([metric, stage, pattern]) => {
    const matches = headings.map(h => String(h).trim().match(pattern)).filter(Boolean);
    if (matches.length !== 1) return [];
    return [{ sede: team.sede, team: team.team, teamId: team.teamId, stage, metric,
      value: Number(matches[0][1]), complete: true, path: `/aliados?id_equipo=${team.teamId}` }];
  });
}

function nodusScopes(goals, matchesGoal) {
  const byId = new Map(goals.filter(g => goals.filter(other => other.id === g.id).length === 1).map(g => [g.id, g]));
  return [...new Map(goals.flatMap(goal => {
    if (!matchesGoal(goal)) return [];
    const parent = byId.get(goal.parentId);
    const team = explicitGoalTeam(goal) || explicitGoalTeam(parent);
    const stage = goalStageKey(goal);
    const sede = canonicalSede(goal.sede || parent?.sede || '');
    return team && sede && !/global/i.test(sede) && ['C1', 'C2'].includes(stage)
      ? [[`${sede}|${team}|${stage}`, { sede, team, stage }]] : [];
  })).values()];
}

export function nodusAllyScopes(goals) {
  return nodusScopes(goals, goal => `${goal.title || ''} ${goal.kpi || ''}`.toLowerCase().includes('aliado'));
}

export function nodusAttendanceScopes(goals) {
  return nodusScopes(goals, goal => /\bsentados\b/i.test(goal.title || ''));
}

export async function collectNodusGoalSources(page, desiredScopes, attendanceScopes = []) {
  await readPage(page, '/equipos');
  const rows = await page.evaluate(() => {
    const table = document.querySelector('#tablaEquipos');
    if (!table) throw new Error('No existe la tabla de equipos esperada.');
    const headers = Array.from(table.querySelectorAll('thead th')).map(t => t.innerText.trim());
    if (['EQUIPO', 'SEDE', 'INICIO', 'FIN'].some(h => !headers.includes(h))) throw new Error('Cambió el esquema de equipos.');
    const dt = window.jQuery?.fn?.dataTable?.isDataTable(table) ? window.jQuery(table).DataTable() : null;
    if (!dt || dt.settings()[0].oFeatures.bServerSide) throw new Error('No se puede confirmar el inventario completo de equipos.');
    return dt.rows().nodes().toArray().map(tr => {
      const cells = Array.from(tr.querySelectorAll('td')).map(t => t.innerText.trim());
      return { equipo: cells[headers.indexOf('EQUIPO')], sede: cells[headers.indexOf('SEDE')],
        start: cells[headers.indexOf('INICIO')], end: cells[headers.indexOf('FIN')],
        path: Array.from(tr.querySelectorAll('a[href]')).map(a => new URL(a.href).pathname).find(p => /^\/equipos\/detalle\/\d+$/.test(p)) };
    });
  });
  const teams = parseNodusTeamRows(rows);
  if (!teams.length) throw new Error('Nodus no devolvió equipos identificables; no se publica un universo vacío.');
  const allies = [];
  const attendance = [];
  for (const scope of attendanceScopes) {
    const matches = teams.filter(t => t.sede === canonicalSede(scope.sede) && t.team === scope.team && t.stage === 'C1');
    if (matches.length !== 1 || !matches[0].end || matches[0].end >= new Date().toISOString().slice(0, 10)) continue;
    const team = matches[0];
    await readPage(page, `/reporte?id_equipo=${team.teamId}`);
    const counts = await page.evaluate(({ teamId, stage }) => {
      if (document.querySelector('select[name="id_equipo"]')?.value !== teamId) {
        throw new Error('El filtro de asistencia no corresponde al equipo solicitado.');
      }
      const table = document.getElementById(`tblReporte${stage}`);
      const headers = Array.from(table?.querySelectorAll('thead th') || []).map(t => t.textContent.trim().toUpperCase());
      const column = headers.indexOf('ASISTENCIA');
      const dt = table && window.jQuery?.fn?.dataTable?.isDataTable(table) ? window.jQuery(table).DataTable() : null;
      if (column < 0 || !dt || dt.settings()[0].oFeatures.bServerSide) throw new Error('No se puede confirmar el reporte completo de asistencia.');
      let marked = 0;
      let unmarked = 0;
      for (const row of dt.rows().nodes().toArray()) {
        const cell = row.cells[column];
        const checkboxes = cell?.querySelectorAll('input[type="checkbox"]');
        if (checkboxes?.length !== 1 || !['Asistió', '—'].includes(cell.textContent.trim()) ||
            (cell.textContent.trim() === 'Asistió') !== checkboxes[0].checked) {
          throw new Error('Cambió el estado de asistencia esperado; no se estima el resultado.');
        }
        if (checkboxes[0].checked) marked++;
        else unmarked++;
      }
      return { marked, unmarked };
    }, { teamId: team.teamId, stage: scope.stage });
    attendance.push({ sede: team.sede, team: team.team, teamId: team.teamId, stage: scope.stage,
      metric: 'markedAttendance', value: counts.marked, unmarked: counts.unmarked,
      complete: true, path: `/reporte?id_equipo=${team.teamId}` });
  }
  for (const scope of desiredScopes) {
    const matches = teams.filter(t => t.sede === canonicalSede(scope.sede) && t.team === scope.team && t.stage === scope.stage);
    if (matches.length !== 1) continue;
    const team = matches[0];
    await readPage(page, `/aliados?id_equipo=${team.teamId}`);
    const headings = await page.evaluate(teamId => {
      const select = document.querySelector('select[name="id_equipo"]');
      if (select?.value !== teamId) throw new Error('El filtro de aliados no corresponde al equipo solicitado.');
      return Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,.card-header')).map(e => e.innerText)
        .filter(s => /^Aliados (Asignados|Confirmados para C2)/i.test(s.trim()));
    }, team.teamId);
    allies.push(...parseAllyHeadings(headings, team).filter(a => a.stage === scope.stage));
  }
  return { schemaVersion: 1, source: NODUS_GOAL_SOURCE, queriedAt: new Date().toISOString(), sourceUpdatedAt: null, teams, allies, attendance };
}

async function main() {
  const db = getNodusAdminDb();
  const goals = await db.collection('goals').get();
  const goalData = goals.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  const scopes = nodusAllyScopes(goalData);
  const attendanceScopes = nodusAttendanceScopes(goalData);
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await loginNodusReadOnly(page, '/sedes');
    const snapshot = await collectNodusGoalSources(page, scopes, attendanceScopes);
    if (process.argv.includes('--apply')) await db.doc('nodus_coordinadores_c1c2/goal_sources').set(snapshot);
    console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'publish' : 'audit',
      queriedAt: snapshot.queriedAt, sourceUpdatedAt: null, teams: snapshot.teams.length, allyMeasures: snapshot.allies.length,
      scopesRequested: scopes.length, attendanceMeasures: snapshot.attendance.length }, null, 2));
  } finally {
    await browser.close();
  }
}

if (process.argv[1]?.endsWith('publishNodusGoalSources.mjs')) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
