import { test } from 'node:test';
import assert from 'node:assert/strict';
import { documentKey, newChallenge, verifyChallenge, issueSession, sessionKey, validSession, consumeRateWindow, CODE_TTL_MS, SESSION_TTL_MS, MAX_ATTEMPTS } from '../../functions-imo/authModel.mjs';
const secret = 'test-only-secret-not-for-production-123456789';
const now = Date.parse('2026-10-06T15:00:00Z');
const options = {secret,imoId:'imo-test',campaignId:'campaign-test',revision:'sync-test',now};
function sent() {const v = newChallenge(options); v.record.delivery = 'sent'; return v;}
test('document lookup preserves leading zeros, separates countries, does not expose the document', () => {
  const key = documentKey(secret,'EC','00.123-456');
  assert.equal(key,documentKey(secret,'EC','00123456'));
  assert.notEqual(key,documentKey(secret,'PE','00123456'));
  assert.notEqual(key,documentKey(secret,'EC','123456'));
  assert.equal(key.includes('00123456'),false);
});
test('OTP expires, cannot be reused or used for another campaign or identity revision', () => {
  const {record,code}=sent();
  assert.equal(verifyChallenge(record,code,{...options,campaignId:'other'}).ok,false);
  assert.equal(verifyChallenge(record,code,{...options,revision:'revoked'}).ok,false);
  assert.equal(verifyChallenge(record,code,{...options,now:now+CODE_TTL_MS}).ok,false);
  const verified=verifyChallenge(record,code,options);
  assert.equal(verified.ok,true);
  assert.equal(verifyChallenge(verified.record,code,options).ok,false);
  const session=issueSession(secret,verified.record,now);
  assert.equal(session.key,sessionKey(secret,session.token));
  assert.equal(validSession(session.record,options),true);
  assert.equal(validSession(session.record,{...options,now:now+SESSION_TTL_MS}),false);
  assert.equal(validSession({...session.record,revoked:true},options),false);
  assert.equal(validSession(session.record,{...options,revision:'new'}),false);
});
test('unsent codes are unusable; incorrect attempts exhaust the challenge', () => {
  const pending=newChallenge(options);
  assert.equal(verifyChallenge(pending.record,pending.code,options).ok,false);
  let {record,code}=sent();
  for(let i=0;i<MAX_ATTEMPTS;i++) record=verifyChallenge(record,'invalid',options).record;
  assert.equal(record.attempts,MAX_ATTEMPTS);
  assert.equal(verifyChallenge(record,code,options).ok,false);
  assert.throws(()=>issueSession(secret,record,now));
});
test('rate window rejects excess requests and opens only after expiry', () => {
  let record;
  for(let i=0;i<5;i++) {const result=consumeRateWindow(record,{now}); assert.equal(result.allowed,true);record=result.record;}
  assert.equal(consumeRateWindow(record,{now:now+1}).allowed,false);
  assert.equal(consumeRateWindow(record,{now:now+15*60*1000}).allowed,true);
});
