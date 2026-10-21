import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { flightMonitorGuide, flyerGuide } from '../src/data/logisticsHelpContent.js';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const deploy = read('../.github/workflows/deploy.yml');
const sync = read('../.github/workflows/flight-monitor.yml');
const syncName = sync.match(/^name: (.+)$/m)[1];
const condition = deploy.match(/    if: >-\n([\s\S]+?)    name:/)[1].trim();
// Evaluate the actual Actions guard, whose boolean syntax also works in JS.
const admits = github => Function('github', `return (${condition});`)(github);
const event = (overrides = {}) => ({
  event_name: 'workflow_run',
  repository: 'crearpodersinlimitesperu-cmd/SO-AR',
  event: {
    workflow_run: {
      conclusion: 'success', name: syncName, head_branch: 'master',
      head_repository: { full_name: 'crearpodersinlimitesperu-cmd/SO-AR' },
      ...overrides
    }
  }
});

test('only the completed flight workflow on master can trigger deployment', () => {
  const trigger = deploy.match(/^  workflow_run:\n([\s\S]+?)^\S/m)[1];
  assert.match(trigger, new RegExp(`workflows: \\["${syncName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\]`));
  assert.match(trigger, /types: \[completed\]/);
  assert.match(trigger, /branches: \[master\]/);
  assert.equal(admits(event()), true);
  for (const conclusion of ['failure', 'cancelled', 'skipped', 'timed_out', 'action_required', null]) {
    assert.equal(admits(event({ conclusion })), false, conclusion);
  }
  assert.equal(admits(event({ head_branch: 'feature' })), false);
  assert.equal(admits(event({ name: 'another workflow' })), false);
  assert.equal(admits(event({ name: deploy.match(/^name: (.+)$/m)[1] })), false, 'no recursion');
  assert.equal(admits(event({ head_repository: { full_name: 'fork/SO-AR' } })), false);
});

test('push and dispatch survive without a workflow_run payload', () => {
  assert.match(deploy, /push:\n    branches:\n      - master/);
  assert.match(deploy, /  workflow_dispatch:/);
  for (const event_name of ['push', 'workflow_dispatch']) {
    assert.equal(admits({ event_name }), true);
  }
});

test('deployment checks out current master after the sync commit, without artifacts or another sync', () => {
  assert.match(deploy, /ref: \$\{\{ github\.event_name == 'workflow_run' && 'refs\/heads\/master' \|\| github\.ref \}\}/);
  assert.doesNotMatch(deploy, /ref:.*head_sha|download-artifact|workflow run|sync_drive_vuelos_7xdia\.py/);
  assert.match(deploy, /group: firebase-production-deploy\n  cancel-in-progress: false/);
  assert.match(deploy, /Deployment source SHA=\$\(git rev-parse HEAD\)/);
});

test('both contextual guides are actionable, collapsible and reuse the Managers presentation', () => {
  for (const guide of [flightMonitorGuide, flyerGuide]) {
    assert.ok(guide.label && guide.intro && guide.scope);
    assert.equal(guide.steps.length, 4);
    for (const [title, text] of guide.steps) assert.ok(title.trim() && text.trim());
  }
  const component = read('../src/components/ModuleQuickGuide.jsx');
  assert.match(component, /import '\.\/ManagersHelp\.css'/);
  assert.match(component, /useState\(true\)/);
  assert.match(component, /useId\(\)/);
  assert.match(component, /type="button".*onClick=.*aria-expanded=\{open\} aria-controls=\{id\}/);
  assert.match(component, /id=\{id\} hidden=\{!open\}/);
  const monitor = read('../src/pages/MonitorVuelosCartas.jsx');
  assert.match(monitor, /activeTab === 'radar' && puedeVerRadar && \([\s\S]*?<ModuleQuickGuide guide=\{flightMonitorGuide\}/);
  const flyer = read('../src/pages/GeneradorFlyer.jsx');
  assert.match(flyer, /<\/header>\s*<ModuleQuickGuide guide=\{flyerGuide\}/);
});

test('guides disclose the external decisions without claiming live status or inferred MJ numbers', () => {
  const flights = JSON.stringify(flightMonitorGuide);
  assert.match(flights, /no confirma despegue/);
  assert.match(flights, /no ejecuta la sincronización de Drive/);
  assert.match(flights, /cada 5 minutos/);
  assert.match(flights, /7 veces al día/);
  assert.match(flights, /elegir y autorizar un proveedor/);
  assert.match(flights, /credenciales.*canal seguro/);
  assert.match(flights, /no hay tracking live habilitado/);
  const flyers = JSON.stringify(flyerGuide);
  assert.match(flyers, /sede \+ equipo exactos/);
  for (const field of ['mjNumero', 'numeroMJ', 'mjNumber']) assert.ok(flyers.includes(field));
  assert.match(flyers, /no basta con añadir una columna/);
  assert.match(flyers, /no tomar el MJ de otro equipo ni inferirlo desde el número de equipo/);
  assert.match(flyers, /no cambian el esquema ni escriben en la fuente/);
});
