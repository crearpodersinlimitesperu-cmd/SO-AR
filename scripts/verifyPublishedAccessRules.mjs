import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { applicationDefault } from 'firebase-admin/app';

const projectId = 'centro-operativo-cpsl';
const { access_token: accessToken } = await applicationDefault().getAccessToken();
const get = async path => {
  const response = await fetch(`https://firebaserules.googleapis.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(30000)
  });
  assert.ok(response.ok, `Unable to verify deployed rules: HTTP ${response.status}`);
  return response.json();
};
const release = await get(`projects/${projectId}/releases/cloud.firestore`);
assert.ok(release.rulesetName, 'Firestore release has no ruleset');
const ruleset = await get(release.rulesetName);
const files = ruleset.source?.files;
assert.ok(Array.isArray(files) && files.length === 1, 'Unexpected deployed rules source');
const normalize = content => content.replace(/\r\n/g, '\n').trim();
const expected = normalize(readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'));
const actual = normalize(files[0].content);
assert.equal(actual, expected, 'Published Firestore rules differ from this commit');
console.log(JSON.stringify({
  projectId,
  ruleset: release.rulesetName,
  sourceSha256: createHash('sha256').update(actual).digest('hex'),
  verified: true
}));
