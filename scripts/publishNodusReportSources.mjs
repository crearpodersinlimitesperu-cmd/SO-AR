import 'dotenv/config';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { buildReportSources, currentReportTeams, nodusTeamScope, REPORT_SEDES, reportSourceStatus } from '../src/services/nodusReportModel.js';
import { OFFICIAL_CALENDAR_URL, parseOfficialCalendar, applyCalendarChanges } from '../functions-imo/calendarModel.mjs';

export async function publishNodusReportSources(db, snapshot) {
  const batch = db.batch();
  for (const source of buildReportSources(snapshot)) batch.set(db.collection('nodus_report_sources').doc(`${source.sede}_${source.stage}`), source);
  await batch.commit();
}

export async function loadReportSnapshot(db) {
  const latest = await db.doc('nodus_coordinadores_c1c2/latest').get();
  if (!latest.exists) throw new Error('Nodus no tiene snapshot publicado.');
  const snapshot = latest.data();
  const granular = await db.collection('nodus_coordinadores_c1c2/latest/equipos').get();
  const rootTeams = snapshot.equiposReporte || [];
  const currentGranular = granular.docs.map(d => d.data()).filter(team =>
    team.timestamp === snapshot.timestamp || team.sourceUpdatedAt === snapshot.timestamp);
  const teams = [...rootTeams];
  for (const team of currentGranular) {
    if (!team.equipoId) continue;
    const matches = teams.map((value, index) => ({ value, index })).filter(({ value }) => String(value.equipoId) === String(team.equipoId));
    if (!matches.length) teams.push(team);
    else if (matches.length === 1 && !Array.isArray(matches[0].value.participantes)) teams[matches[0].index] = team;
  }
  return {
    snapshot: { ...snapshot, equiposReporte: teams },
    inventory: {
      rootTeams: rootTeams.length, granularTeams: granular.size,
      currentGranularTeams: currentGranular.length,
      scopedTeams: teams.flatMap(team => {
        const scope = nodusTeamScope(team);
        return scope ? [{ ...scope, rows: Array.isArray(team.participantes) ? team.participantes.length : null }] : [];
      }),
      unscopedTeams: teams.filter(team => !nodusTeamScope(team)).length
    }
  };
}

async function main() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const app = getApps()[0] || initializeApp({ credential: raw ? cert(JSON.parse(raw)) : applicationDefault(), projectId: 'centro-operativo-cpsl' });
  const db = getFirestore(app);
  const { snapshot, inventory } = await loadReportSnapshot(db);
  const sources = buildReportSources(snapshot);
  if (process.argv.includes('--apply')) {
    await publishNodusReportSources(db, snapshot);
    console.log('Publicadas 12 fuentes agregadas sin datos personales; Nodus no fue modificado.');
  }
  const response = await fetch(OFFICIAL_CALENDAR_URL);
  if (!response.ok) throw new Error(`Calendario HTTP ${response.status}`);
  const changes = await db.collection('operational_event_changes').get();
  const events = applyCalendarChanges(parseOfficialCalendar(await response.text()), changes.docs.map(d => ({ id: d.id, ...d.data() })));
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const evidence = REPORT_SEDES.flatMap(sede => ['C1', 'C2'].flatMap(stage => {
    const targets = currentReportTeams(events, sede, stage, today);
    return (targets.length ? targets : [null]).map(target => {
      const status = reportSourceStatus(sources.find(s => s.sede === sede && s.stage === stage), target);
      return { sede, stage, team: target?.team || null, fds: target?.start || null, sourceUpdatedAt: snapshot.timestamp || null, ready: status.ready, counts: status.counts || null, detail: status.message };
    });
  }));
  console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'publish' : 'read-only', today, inventory, evidence }, null, 2));
}

if (process.argv[1]?.endsWith('publishNodusReportSources.mjs')) main().catch(error => { console.error(error.message); process.exitCode = 1; });
