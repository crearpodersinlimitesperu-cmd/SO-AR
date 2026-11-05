import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { build } from 'vite';
import { assertLocalDemo, assertEmulatorEnvironment, demoProject } from '../prototypes/aliados-c2/private/local/environment.js';
import { validateGuide } from '../prototypes/aliados-c2/private/local/guideContract.js';
import { syntheticGuide, fixturePassword } from '../prototypes/aliados-c2/private/fixtures.mjs';

test('local environment refuses non-demo projects, non-loopback and incomplete emulator configuration', () => {
  for (const hostname of ['localhost', '127.0.0.1', '[::1]']) assert.doesNotThrow(() => assertLocalDemo(demoProject, hostname));
  for (const project of ['aliados-crear-global', 'demo-other', '', undefined]) {
    assert.throws(() => assertLocalDemo(project, '127.0.0.1'));
  }
  for (const hostname of ['crearpsl.net', '0.0.0.0', '127.0.0.1.evil.test', '192.168.1.1']) {
    assert.throws(() => assertLocalDemo(demoProject, hostname));
  }
  const env = { GCLOUD_PROJECT: demoProject, FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9198', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8198' };
  assert.doesNotThrow(() => assertEmulatorEnvironment(env));
  for (const key of Object.keys(env)) assert.throws(() => assertEmulatorEnvironment({ ...env, [key]: '' }));
});

test('server guide contract has no fallback for missing or malformed content', () => {
  assert.equal(validateGuide(syntheticGuide), syntheticGuide);
  for (const guide of [null, {}, { ...syntheticGuide, version: 'wrong' },
    { ...syntheticGuide, preparation: [] }, { ...syntheticGuide, phases: [] }]) {
    assert.throws(() => validateGuide(guide));
  }
});

test('private entry graph excludes operational source and fixtures; deployment stays deny-all', () => {
  const root = 'prototypes/aliados-c2/private/local';
  const source = readdirSync(root).filter(name => /\.(js|jsx|html)$/.test(name))
    .map(name => readFileSync(`${root}/${name}`, 'utf8')).join('\n');
  assert.doesNotMatch(source, /content\.js|fixtures\.mjs|sistemas@crearpsl\.net|fixturePassword|localStorage|indexedDB/);
  assert.match(source, /inMemoryPersistence/);
  assert.match(source, /memoryLocalCache/);
  assert.deepEqual(JSON.parse(readFileSync('prototypes/aliados-c2/private/firebase.json', 'utf8')),
    { firestore: { rules: 'closed.rules' } });
});

test('isolated build excludes operational guide and emulator fixture content/secrets', async () => {
  const result = await build({
    configFile: 'prototypes/aliados-c2/private/local/vite.config.js',
    logLevel: 'silent', build: { write: false },
  });
  const outputs = (Array.isArray(result) ? result : [result]).flatMap(item => item.output);
  const javascript = outputs.filter(item => item.type === 'chunk').map(item => item.code).join('\n');
  for (const forbidden of [
    syntheticGuide.title, syntheticGuide.phases[0].body, fixturePassword, 'sistemas@crearpsl.net',
    'Socios de Vida', 'Ticket Verde', '14:01', '90 días',
  ]) assert.equal(javascript.includes(forbidden), false, `Excluded from bundle: ${forbidden}`);
  assert.ok(outputs.some(item => item.fileName === 'index.html'));
  assert.match(javascript, /demo-aliados-c2/);
});
