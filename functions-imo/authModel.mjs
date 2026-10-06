import { createHmac, randomInt, randomBytes, timingSafeEqual } from 'node:crypto';

export const CODE_TTL_MS = 10 * 60 * 1000;
export const SESSION_TTL_MS = 30 * 60 * 1000;
export const MAX_ATTEMPTS = 5;
function digest(secret, purpose, value) {
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('Verification secret unavailable');
  return createHmac('sha256', secret).update(`${purpose}\0${value}`).digest('hex');
}
export function documentKey(secret, country, document) {
  const normalized = String(document || '').normalize('NFKC').trim().toUpperCase().replace(/[ .-]/g, '');
  if (!/^[A-Z0-9]{6,20}$/.test(normalized) || !/^[A-Z]{2}$/.test(country)) throw new Error('Invalid identity');
  return digest(secret, 'identity', `${country}:${normalized}`);
}
export function newChallenge({ secret, imoId, campaignId, revision, now = Date.now() }) {
  if (!imoId || !campaignId || !revision || !Number.isFinite(now)) throw new Error('Unverified identity');
  const id = randomBytes(24).toString('hex');
  const code = String(randomInt(0, 1000000)).padStart(6, '0');
  return { code, record: { id, imoId, campaignId, revision, codeHash: digest(secret, 'otp', `${id}:${code}`), createdAt: now, expiresAt: now + CODE_TTL_MS, attempts: 0, consumedAt: null, delivery: 'pending' } };
}
// Caller must read, validate and persist the returned record in ONE Firestore transaction.
// Failed attempts must be committed before returning a generic error to the client.
export function verifyChallenge(record, code, { secret, campaignId, revision, now = Date.now() }) {
  if (!record || record.delivery !== 'sent' || record.consumedAt !== null || record.campaignId !== campaignId || record.revision !== revision || !Number.isFinite(now) || !Number.isFinite(record.expiresAt) || now >= record.expiresAt || !Number.isInteger(record.attempts) || record.attempts >= MAX_ATTEMPTS || !/^[a-f0-9]{64}$/.test(record.codeHash)) return { ok: false, record };
  const next = { ...record, attempts: record.attempts + 1 };
  const supplied = digest(secret, 'otp', `${record.id}:${String(code)}`);
  if (!/^\d{6}$/.test(String(code)) || !timingSafeEqual(Buffer.from(supplied, 'hex'), Buffer.from(record.codeHash, 'hex'))) return { ok: false, record: next };
  return { ok: true, record: { ...next, consumedAt: now } };
}
export function issueSession(secret, challenge, now = Date.now()) {
  if (challenge.consumedAt === null || !Number.isFinite(challenge.consumedAt) || !Number.isFinite(now) || now < challenge.consumedAt || now >= challenge.expiresAt) throw new Error('Challenge not verified');
  const token = randomBytes(32).toString('base64url');
  return { token, key: digest(secret, 'session', token), record: { imoId: challenge.imoId, campaignId: challenge.campaignId, revision: challenge.revision, createdAt: now, expiresAt: now + SESSION_TTL_MS, revoked: false } };
}
export function sessionKey(secret, token) {
  if (!/^[a-zA-Z0-9_-]{43}$/.test(String(token))) throw new Error('Invalid session');
  return digest(secret, 'session', token);
}
export function validSession(record, { campaignId, revision, now = Date.now() }) {
  return !!record && record.revoked === false && record.campaignId === campaignId && record.revision === revision && Number.isFinite(record.expiresAt) && Number.isFinite(now) && now < record.expiresAt;
}
// Invoke transactionally for BOTH trusted client IP and private identity key.
export function consumeRateWindow(record, { now = Date.now(), limit = 5, windowMs = 15 * 60 * 1000 } = {}) {
  if (!Number.isFinite(now) || !Number.isInteger(limit) || limit < 1 || !Number.isFinite(windowMs) || windowMs <= 0) throw new Error('Invalid rate policy');
  const current = record && Number.isFinite(record.startedAt) && now >= record.startedAt && now - record.startedAt < windowMs ? record : { startedAt: now, count: 0 };
  if (!Number.isInteger(current.count) || current.count < 0 || current.count >= limit) return { allowed: false, record: current };
  return { allowed: true, record: { ...current, count: current.count + 1 } };
}
