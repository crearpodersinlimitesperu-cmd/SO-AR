import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  managersFieldHelp, managersActionHelp, managersGuides, managersGuideStorageKey, managersTabHelpKeys,
  getManagersGuideRole, shouldExplainAction
} from './managersHelpContent.js';

test('each view has a short, actionable guide and its own visual preference key', () => {
  const roles = ['entrenador', 'cmj', 'direccion', 'consulta'];
  for (const role of roles) {
    const guide = managersGuides[role];
    assert.ok(guide.label);
    assert.ok(guide.steps.length >= 3 && guide.steps.length <= 5);
    for (const [title, text] of guide.steps) {
      assert.ok(title.trim());
      assert.ok(text.trim());
    }
  }
  assert.equal(new Set(roles.map(managersGuideStorageKey)).size, roles.length);
});

test('guide selection follows the existing active view and visibility flags', () => {
  assert.equal(getManagersGuideRole({ viewAsTrainer: true, canViewAll: true, canViewOwnSede: true }), 'entrenador');
  assert.equal(getManagersGuideRole({ viewAsTrainer: false, canViewAll: true }), 'direccion');
  assert.equal(getManagersGuideRole({ canViewOwnSede: true }), 'cmj');
  assert.equal(getManagersGuideRole({}), 'consulta');
});

test('every Managers tab has a specific purpose, not only a generic navigation hint', () => {
  for (const tab of ['directorio', 'grupales', 'dashboard', 'entrenadores', 'kpis_llamadas', 'liquidacion']) {
    const help = managersActionHelp[managersTabHelpKeys[tab]];
    assert.ok(help?.label?.trim(), tab);
    assert.ok(help?.text?.trim(), tab);
  }
});

test('key fields explain official identity, country code and distinct team numbers', () => {
  for (const key of ['nombre', 'telefono', 'rol', 'sede', 'equipo', 'numEquipo', 'entrenador', 'estado', 'nota', 'respuesta', 'fechaIndividual', 'fechaGrupal', 'asistencia', 'asistieron']) {
    assert.ok(managersFieldHelp[key]?.text.trim(), key);
    assert.ok(managersFieldHelp[key]?.good.trim(), `${key}: example`);
    assert.ok(managersFieldHelp[key]?.avoid.trim(), `${key}: contrast`);
  }
  assert.match(managersFieldHelp.nombre.text, /documento oficial de identidad/);
  assert.match(managersFieldHelp.nombre.text, /tildes/);
  assert.match(managersFieldHelp.telefono.text, /código de país/);
  assert.match(managersFieldHelp.equipo.avoid, /#122.*#124/);
  assert.match(managersActionHelp.supervisor.text, /purgar.*NO es solo una consulta/);
  assert.match(managersActionHelp.marcarPagado.text, /NO transfiere dinero/);
  assert.match(managersActionHelp.reversarPago.text, /NO revierte la transferencia bancaria/);
});

test('all fields, buttons and links in Managers and its KPI detail use centralized help', () => {
  for (const path of ['../pages/CentroManagers.jsx', '../components/KPIsEntrenadoresLlamadas.jsx']) {
    const page = readFileSync(new URL(path, import.meta.url), 'utf8');
    assert.doesNotMatch(page, /<(?:input|select|textarea|button|a)\b/, path);
    const matches = [...page.matchAll(/<(HelpButton|HelpInput|HelpSelect|HelpTextarea|HelpLink)\s+helpKey="([^"]+)"/g)];
    assert.ok(matches.some(match => match[1] === 'HelpButton'), path);
    assert.ok(matches.some(match => match[1] === 'HelpInput'), path);
    for (const [, tag, key] of matches) {
      const entry = (['HelpButton', 'HelpLink'].includes(tag) ? managersActionHelp : managersFieldHelp)[key];
      assert.ok(entry?.label?.trim(), `${tag}: ${key}`);
      assert.ok(entry?.text?.trim(), `${tag}: ${key}`);
    }
  }
});

test('learning blocks actions only when explicitly enabled and always permits exiting', () => {
  for (const key of Object.keys(managersActionHelp)) {
    assert.equal(shouldExplainAction(false, key), false, key);
    assert.equal(shouldExplainAction(true, key), !['cerrar', 'cancelar', 'aceptar'].includes(key), key);
  }
});
