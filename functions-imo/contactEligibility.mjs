import { c1Eligibility } from './c1Eligibility.mjs';

export const CONTACT_MISSION = 'registered-c1-contact';

export function contactRegistration(row, source) {
  const registration = row?.c1Registration;
  if (!registration || registration.source) return registration;
  // Compatibility with the scoped import: identity and destination were
  // validated before this stored record was written; never use table C1 flags.
  if ((source?.schemaVersion !== undefined && source.schemaVersion !== 1) || row.c1Source !== 'Nodus /participantessede/datosTabla' ||
      !/^\d+$/.test(row.nodusParticipantId || '') || !source?.sede ||
      !Number.isInteger(source.targetTeam) || source.targetTeam < 1 ||
      !Number.isFinite(Date.parse(source.c1SourceUpdatedAt || ''))) return registration;
  return { ...registration, source: 'Nodus /participantessede/datos',
    sede: source.sede, targetTeam: source.targetTeam };
}

export function contactCandidateReason(row, context = {}) {
  const history = c1Eligibility(row);
  if (history === 'already_attended') return 'already_attended';
  if (history === 'eligible') return 'historical_eligible';
  const registration = row?.c1Registration;
  if (!registration || registration.source !== 'Nodus /participantessede/datos') return 'registration_source_unverified';
  if (registration.chapter !== true) return 'not_registered';
  if (registration.sede !== context.sede || !Number.isInteger(registration.targetTeam) ||
      registration.targetTeam !== Number(context.targetTeam)) return 'registration_scope_mismatch';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(registration.date || '') ||
      !Number.isFinite(Date.parse(registration.date)) ||
      new Date(registration.date).toISOString().slice(0, 10) !== registration.date ||
      registration.date !== context.c1Date) return 'registration_date_mismatch';
  if (registration.status == null || registration.status === '') return 'attendance_intention_missing';
  if (!['pendiente', 'confirmado'].includes(registration.status)) return 'attendance_intention_unsupported';
  return 'registered_contact';
}

export function isContactCandidate(row, context = {}) {
  return ['historical_eligible', 'registered_contact'].includes(contactCandidateReason(row, context));
}

export function isMissionCandidate(row, context = {}) {
  return context.missionKind === CONTACT_MISSION
    ? isContactCandidate(row, context) : c1Eligibility(row) === 'eligible';
}
