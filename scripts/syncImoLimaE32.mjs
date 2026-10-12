// Explicit Lima149/E32 scope. Never creates a campaign or modifies Nodus.
import puppeteer from 'puppeteer';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { adaptC1Participant, matchReportParticipant } from './imoC1SourceContract.mjs';
import { readNodusC1Report, waitForC1Report } from './nodusC1Report.mjs';
import { buildC1Index, reconcileC1 } from './imoC1Reconciliation.mjs';
import { c1Eligibility } from '../functions-imo/c1Eligibility.mjs';
import { OFFICIAL_CALENDAR_URL, parseOfficialCalendar, findC1Dates } from '../functions-imo/calendarModel.mjs';

const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}');
if (credentials.project_id !== 'centro-operativo-cpsl') throw new Error('Unexpected project');
const db = getFirestore(initializeApp({ credential: cert(credentials) }));
const apply = process.argv.includes('--apply');
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_BIN, headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'] });
let stage = 'login';
let writes = 0;
const relationCounts = { reportRows: 0, matched: 0, missingName: 0, missingPhone: 0, missingInviter: 0, duplicate: 0 };
try {
  const page = await browser.newPage();
  const origin = 'https://imo.crearpslglobal.com';
  async function checkAccess(response) {
    if (!response?.ok() || /captcha|challenge|sgcaptcha/i.test(page.url()) ||
        await page.$('iframe[src*="captcha"]')) throw new Error('Authorized access or human verification required');
  }
  await checkAccess(await page.goto(origin + '/auth/login', { waitUntil: 'networkidle2' }));
  if (!process.env.NODUS_USER || !process.env.NODUS_PASSWORD) throw new Error('Configured access unavailable');
  await page.locator('input[name="usuario"]').fill(process.env.NODUS_USER);
  await page.locator('input[name="password"]').fill(process.env.NODUS_PASSWORD);
  const [navigation] = await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    page.locator('button[type="submit"]').click(),
  ]);
  await checkAccess(navigation);
  if (/login/i.test(page.url())) throw new Error('Authorized access or human verification required');
  stage = 'team-report';
  await checkAccess(await page.goto(origin + '/reporte?id_equipo=149', { waitUntil: 'networkidle2' }));
  const selected = await page.$eval('select[name="id_equipo"] option:checked', e => e.textContent);
  if (!/EQUIPO\s*32\b/i.test(selected) || !/\bLIMA\b/i.test(selected) || !/CICLO\s*1\b/i.test(selected)) {
    throw new Error('Exact Lima E32 C1 scope unavailable');
  }
  await waitForC1Report(page);
  const report = await page.evaluate(readNodusC1Report, '149');
  stage = 'scoped-participant-details';
  const source = await page.evaluate(async expectedCount => {
    const read = async start => {
      const r = await fetch(`/participantessede/datosTabla?draw=1&start=${start}&length=500&id_sede=7&id_equipo=149`);
      if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) throw new Error('Source unavailable');
      const p = await r.json();
      if (!Array.isArray(p.data) || Number(p.recordsFiltered) !== expectedCount) throw new Error('Scoped source incomplete');
      return p;
    };
    const first = await read(0), size = first.data.length;
    if (!size) throw new Error('Scoped source empty');
    const rows = [...first.data];
    for (let start = size; start < expectedCount; start += size) {
      const p = await read(start);
      if (p.data.length !== Math.min(size, expectedCount - start)) throw new Error('Scoped source incomplete');
      rows.push(...p.data);
    }
    if (rows.length !== expectedCount || new Set(rows.map(r => String(r.id))).size !== expectedCount ||
        rows.some(r => String(r.id_equipo) !== '149')) throw new Error('Scoped source mismatch');
    const fields = ['id', 'id_equipo', 'nombres', 'apellidos', 'telefono', 'id_invitador', 'nombre_imo'];
    const results = [];
    for (const row of rows) {
      const r = await fetch('/participantessede/datos/' + encodeURIComponent(row.id));
      if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) throw new Error('Detail unavailable');
      const p = await r.json();
      if (!p.ok || !p.p) throw new Error('Detail unavailable');
      const pick = (v, keys) => Object.fromEntries(keys.map(k => [k, v[k] ?? null]));
      results.push({ row: pick(row, fields),
        detail: pick(p.p, [...fields, 'capitulo1', 'fecha_c1', 'asistencia']) });
    }
    return results;
  }, report.length);
  stage = 'identity-validation';
  const adapted = source.map(({ row, detail }) => adaptC1Participant(row, detail));
  const index = buildC1Index(adapted);
  stage = 'official-calendar';
  const response = await fetch(OFFICIAL_CALENDAR_URL);
  if (!response.ok) throw new Error('Calendar unavailable');
  const dates = findC1Dates(parseOfficialCalendar(await response.text()), 'Lima', 32);
  if (dates.length !== 1) throw new Error('Official date ambiguous');
  const at = new Date().toISOString();
  const norm = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
  const groups = new Map();
  stage = 'complete-relation-validation';
  for (const p of report) {
    if (!p.imo || /^sin (invitador|imo|enrolador)\b/i.test(p.imo)) continue;
    const matches = matchReportParticipant(p, adapted);
    relationCounts.reportRows++;
    if (matches.length !== 1) {
      const names = adapted.filter(r => norm(`${r.nombres} ${r.apellidos}`) === norm(`${p.nombres} ${p.apellidos}`));
      const phones = names.filter(r => String(r.telefono).replace(/\D/g, '') === String(p.telefono).replace(/\D/g, ''));
      if (!names.length) relationCounts.missingName++;
      else if (!phones.length) relationCounts.missingPhone++;
      else if (!matches.length) relationCounts.missingInviter++;
      else relationCounts.duplicate++;
      continue;
    }
    relationCounts.matched++;
    const row = matches[0];
    if (row.c1Registration.date !== dates[0].date || !row.c1Registration.chapter) throw new Error('Registration scope mismatch');
    const key = p.imo.trim();
    const id = `imo_${key.toLowerCase().replace(/[^a-z0-9]/g, '_')}_149`;
    if (!groups.has(id)) groups.set(id, { imoNombre: key, enrolados: [] });
    const group = groups.get(id);
    if (group.imoNombre !== key) throw new Error('Inviter key collision');
    group.enrolados.push({ id: `enr_nodus_${row.id}`, nodusParticipantId: String(row.id),
      nombre: `${p.nombres} ${p.apellidos}`.trim(), telefono: row.telefono,
      coordinadora_nombre: p.coordinador || '', c1Registration: row.c1Registration,
      ...reconcileC1({ nodusParticipantId: String(row.id) }, group, index, at) });
  }
  if (relationCounts.matched !== relationCounts.reportRows) throw new Error('Participant relation ambiguous');
  const stats = { apply, teamId: 149, sede: 'Lima', targetTeam: 32, sourceRows: adapted.length,
    sourceMissions: groups.size, eligible: 0, already_attended: 0, unverified: 0, writes: 0,
    c1Date: dates[0].date, queriedAt: at, campaignsCreated: 0 };
  stage = 'projection';
  for (const [id, group] of groups) {
    group.enrolados.forEach(e => stats[c1Eligibility(e)]++);
    if (!apply) continue;
    await db.runTransaction(async tx => {
      const ref = db.doc(`imo_missions/${id}`);
      const existing = await tx.get(ref);
      if (existing.exists && (existing.data().schemaVersion === 2 || existing.data().sede !== 'Lima' ||
          existing.data().targetTeam !== 32)) throw new Error('Existing mission scope mismatch');
      const previous = existing.data()?.enrolados || [];
      const enrolados = group.enrolados.map(e => {
        const matches = previous.filter(p => p.nodusParticipantId === e.nodusParticipantId ||
          (norm(p.nombre) === norm(e.nombre) && p.telefono === e.telefono));
        if (matches.length > 1) throw new Error('Existing enrollee identity ambiguous');
        return { ...matches[0], ...e, id: matches[0]?.id || e.id };
      });
      tx.set(ref, { ...group, enrolados, sede: 'Lima', targetTeam: 32, equipo: 'EQUIPO 32 - LIMA CICLO 1',
        lastUpdated: at, c1SourceUpdatedAt: at }, { merge: true });
    });
    stats.writes++;
    writes++;
  }
  console.log('IMO_LIMA_E32_SYNC ' + JSON.stringify(stats));
} catch (error) {
  const safeReasons = ['Authorized access or human verification required', 'Configured access unavailable',
    'Exact Lima E32 C1 scope unavailable', 'Participant detail mismatch', 'Participant identity changed',
    'Participant team mismatch', 'Calendar unavailable', 'Official date ambiguous',
    'Participant relation ambiguous', 'Registration scope mismatch', 'Inviter key collision',
    'Existing mission scope mismatch', 'Existing enrollee identity ambiguous'];
  console.error('IMO_LIMA_E32_SYNC_FAILED ' + JSON.stringify({ stage, apply, writes,
    relationCounts,
    reason: safeReasons.includes(error.message) ? error.message : 'Source unavailable; private details suppressed',
    campaignsCreated: 0 }));
  process.exitCode = 1;
} finally {
  await browser.close();
  await db.terminate();
}
