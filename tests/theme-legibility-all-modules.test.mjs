import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const APP_PATH = path.join(ROOT, 'src', 'App.jsx');
const CSS_PATH = path.join(ROOT, 'src', 'index.css');
const PAGES_DIR = path.join(ROOT, 'src', 'pages');

test('App.jsx monta ThemeToggle y RefreshCw globalmente en todos los módulos sin excepción', () => {
  const appSrc = fs.readFileSync(APP_PATH, 'utf8');
  assert.match(appSrc, /const showFloatingThemeToggle\s*=\s*true;/, 'showFloatingThemeToggle debe ser true para cubrir todas las rutas');
  assert.match(appSrc, /<ThemeToggle\s*\/>/, 'ThemeToggle debe estar montado en App.jsx');
  assert.match(appSrc, /className="no-print floating-refresh-btn"/, 'El botón flotante de actualización debe estar montado en App.jsx');
});

test('src/index.css protege el contraste de tarjetas oscuras y textos neón en [data-theme="light"]', () => {
  const css = fs.readFileSync(CSS_PATH, 'utf8');
  const requiredBackgroundGuards = [
    '#050811',
    '#091124',
    '#0b1325',
    '#111c38',
    '#0f172a',
    '#1e293b',
    'rgba(9, 17, 36'
  ];
  for (const token of requiredBackgroundGuards) {
    assert.ok(
      css.includes(token),
      `src/index.css debe incluir protección [data-theme="light"] para fondo oscuro ${token}`
    );
  }

  const requiredTextGuards = [
    '#ffffff',
    '#fff',
    '#f8fafc',
    '#e2e8f0',
    '#cbd5e1',
    '#94a3b8',
    '#34d399',
    '#38bdf8',
    '#fbbf24',
    '#fb7185'
  ];
  for (const token of requiredTextGuards) {
    assert.ok(
      css.includes(token),
      `src/index.css debe incluir protección [data-theme="light"] para color de texto ${token}`
    );
  }
});

test('Todos los módulos en src/pages/*.jsx están cubiertos contra texto ilegible en Modo Claro', () => {
  const css = fs.readFileSync(CSS_PATH, 'utf8');
  const pageFiles = fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith('.jsx'));
  assert.ok(pageFiles.length > 0, 'Debe existir al menos un módulo en src/pages');

  const darkTokensToVerify = ['#050811', '#091124', '#0b1325', '#111c38'];
  for (const file of pageFiles) {
    const src = fs.readFileSync(path.join(PAGES_DIR, file), 'utf8');
    const isContractDarkLocked = src.includes('maestria-contract-root') || src.includes('fuego-contract-root');
    if (isContractDarkLocked) continue;

    for (const token of darkTokensToVerify) {
      if (src.includes(token)) {
        assert.ok(
          css.includes(token),
          `${file} usa fondo oscuro ${token} sin regla de adaptación [data-theme="light"] en src/index.css`
        );
      }
    }
  }
});
