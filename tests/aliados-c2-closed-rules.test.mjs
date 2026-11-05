import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('only deny-all rules are configured for deployment while Auth is unavailable', () => {
  const config = JSON.parse(readFileSync('prototypes/aliados-c2/private/firebase.json', 'utf8'));
  assert.deepEqual(config, { firestore: { rules: 'closed.rules' } });
  const closed = readFileSync('prototypes/aliados-c2/private/closed.rules', 'utf8');
  assert.match(closed, /allow read, write: if false;/);
  assert.doesNotMatch(closed, /if true|request\.auth/);
});
