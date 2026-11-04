import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { isAssetLoadError } from './assetLoadErrors.js';

const cssError = new Error('Unable to preload CSS for /assets/Home-BmM63uPv.css');

test('recognizes the reported Vite CSS failure and previous module/chunk failures', () => {
  for (const error of [
    cssError,
    'unable to preload css for https://example.test/assets/Home-BmM63uPv.css',
    new TypeError('Failed to fetch dynamically imported module: /assets/Home.js'),
    new TypeError('Importing a module script failed.'),
    new Error('Loading chunk 42 failed.')
  ]) {
    assert.equal(isAssetLoadError(error), true, String(error));
  }
  for (const error of [null, undefined, '', new Error('Permission denied'), new TypeError('Cannot read properties of null')]) {
    assert.equal(isAssetLoadError(error), false, String(error));
  }
});

// Exercise the actual lifecycle method without needing to render JSX.
const source = readFileSync(new URL('../components/ErrorBoundary.jsx', import.meta.url), 'utf8');
const catchBody = source.slice(source.indexOf('  componentDidCatch('), source.indexOf('  handleReload ='));

function boundaryFixture({ storedAt = null, storageFails = false } = {}) {
  const replacements = [];
  let stored = storedAt;
  const boundary = runInNewContext(`({ ${catchBody} })`, {
    isAssetLoadError,
    console: { error() {}, warn() {} },
    URL,
    Date: { now: () => 100000 },
    sessionStorage: {
      getItem(key) {
        assert.equal(key, 'causa:chunk-reload:/managers');
        if (storageFails) throw new Error('Storage unavailable');
        return stored;
      },
      setItem(key, value) {
        assert.equal(key, 'causa:chunk-reload:/managers');
        stored = value;
      }
    },
    window: { location: {
      pathname: '/managers',
      href: 'https://example.test/managers?tab=liquidacion#historial',
      replace: url => replacements.push(url)
    } }
  });
  boundary.setState = () => {};
  return { boundary, replacements, getStored: () => stored };
}

test('CSS recovery preserves route/query/hash and prevents an immediate reload loop', () => {
  const fixture = boundaryFixture();
  fixture.boundary.componentDidCatch(cssError, {});
  assert.equal(fixture.replacements.length, 1);
  const url = new URL(fixture.replacements[0]);
  assert.equal(url.pathname, '/managers');
  assert.equal(url.searchParams.get('tab'), 'liquidacion');
  assert.equal(url.searchParams.get('_app_reload'), '100000');
  assert.equal(url.hash, '#historial');
  assert.equal(fixture.getStored(), '100000');
  fixture.boundary.componentDidCatch(cssError, {});
  assert.equal(fixture.replacements.length, 1);
});

test('existing cooldown, expired cooldown, storage errors and unrelated failures retain behavior', () => {
  for (const [options, error, expected] of [
    [{ storedAt: '90000' }, cssError, 0],
    [{ storedAt: '60000' }, cssError, 1],
    [{ storageFails: true }, cssError, 0],
    [{}, new Error('Permission denied'), 0]
  ]) {
    const fixture = boundaryFixture(options);
    fixture.boundary.componentDidCatch(error, {});
    assert.equal(fixture.replacements.length, expected);
  }
});
