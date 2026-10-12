// Read-only scoped audit. Output is counts and timestamps, never participant data.
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { buildCampaignCandidates, recordTeamNumber } from '../src/features/imo/campaignCandidates.js';
import { c1Eligibility, isAvailableForC1 } from '../functions-imo/c1Eligibility.mjs';
import { calendarSede, OFFICIAL_CALENDAR_URL, parseOfficialCalendar, applyCalendarChanges, findC1Dates } from '../functions-imo/calendarModel.mjs';
import { getEnroladosList } from '../src/features/imo/missionEnrolados.js';

export function summarizeReadiness(missions, events, campaigns, sede, targetTeam) {
  const resolveSede = m => calendarSede(m.sede);
  const scoped = missions.filter(m => m.schemaVersion !== 2 &&
    recordTeamNumber(m) === targetTeam && resolveSede(m) === sede);
  const unknownSedeRecords = missions.filter(m => m.schemaVersion !== 2 &&
    recordTeamNumber(m) === targetTeam && (!m.sede || ['No especificada', 'Sede Global'].includes(m.sede))).length;
  const statuses = { eligible: 0, already_attended: 0, unverified: 0 };
  for (const m of scoped) for (const e of getEnroladosList(m)) statuses[c1Eligibility(e)]++;
  const { candidates, conflicts, phoneConflicts } = buildCampaignCandidates(missions, {
    sede, targetTeam, resolveSede, getEnrolados: m => getEnroladosList(m).filter(isAvailableForC1),
  });
  const dates = findC1Dates(events, sede, targetTeam).map(e => ({ date: e.date, source: e.source }));
  const timestamps = scoped.map(m => m.c1SourceUpdatedAt).filter(v => typeof v === 'string' && Number.isFinite(Date.parse(v))).sort();
  return {
    sede, targetTeam, scope: 'explicit stored sede only; inferred sede not certified',
    sourceMissions: scoped.length, unknownSedeRecords, statuses,
    candidateImos: candidates.length, candidateEnrollees: candidates.reduce((n, c) => n + c.enrolados.length, 0),
    ownershipConflicts: conflicts.length, phoneConflicts: phoneConflicts.length,
    c1SourceTimestamps: { known: timestamps.length, missing: scoped.length - timestamps.length,
      oldest: timestamps[0] || null, newest: timestamps.at(-1) || null },
    c1Dates: dates,
    activeCampaigns: campaigns.filter(c => c.sede === sede && c.targetTeam === targetTeam && c.status === 'active').length,
    sharingAuthorized: false,
    blockers: [
      ...(scoped.length ? [] : ['no_source_missions']),
      ...(candidates.length ? [] : ['no_eligible_candidates']),
      ...(statuses.unverified ? ['unverified_c1_evidence'] : []),
      ...(unknownSedeRecords ? ['unknown_sede_records'] : []),
      ...(conflicts.length || phoneConflicts.length ? ['candidate_conflicts_require_review'] : []),
      ...(timestamps.length !== scoped.length ? ['missing_c1_source_timestamps'] : []),
      ...(dates.length === 1 ? [] : ['missing_or_ambiguous_c1_date']),
      'authorized_manager_review_required',
    ],
  };
}

async function main() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}');
  if (credentials.project_id !== 'centro-operativo-cpsl') throw new Error('Unexpected project');
  const db = getFirestore(initializeApp({ credential: cert(credentials) }));
  try {
    const [missions, campaigns, changes, response] = await Promise.all([
      db.collection('imo_missions').get(),
      db.collection('imo_campaigns').where('sede', '==', 'Lima').get(),
      db.collection('calendario_operativo_publico').get(),
      fetch(OFFICIAL_CALENDAR_URL, { signal: AbortSignal.timeout(60000) }),
    ]);
    if (!response.ok) throw new Error('Calendar unavailable');
    const events = applyCalendarChanges(parseOfficialCalendar(await response.text()),
      changes.docs.map(d => ({ ...d.data(), id: d.id })));
    console.log('IMO_CAMPAIGN_READINESS ' + JSON.stringify({
      queriedAt: new Date().toISOString(),
      ...summarizeReadiness(missions.docs.map(d => ({ ...d.data(), id: d.id })),
        events, campaigns.docs.map(d => d.data()), 'Lima', 32),
    }));
  } finally {
    await db.terminate();
  }
}
if (process.argv[1]?.endsWith('auditImoCampaignReadiness.mjs')) {
  main().catch(() => {
    console.error('IMO_CAMPAIGN_READINESS_FAILED: authorized source read unavailable; private details suppressed');
    process.exitCode = 1;
  });
}
