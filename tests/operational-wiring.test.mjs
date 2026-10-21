import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('task deep links survive sign-in and the personalized home redirect', () => {
  const app = read('src/App.jsx');
  assert.match(app, /encodeURIComponent\(window\.location\.pathname \+ window\.location\.search\)/);
  assert.match(app, /isElizabethEscobar\(currentUser\) && !new URLSearchParams\(location\.search\)\.has\('taskId'\)/);
  const login = read('src/pages/Login.jsx');
  assert.match(login, /searchParams\.get\('from'\)/);
  assert.match(login, /navigate\(from\)/);
  const home = read('src/pages/Home.jsx');
  assert.match(home, /resolveTaskLink\(linkedTaskId/);
  assert.doesNotMatch(home, /doc\(db, 'checklist_tasks', notif\.taskId\)/);
  assert.match(home, /!targetTask && !notif\.taskId/);
});

test('feedback read errors cannot masquerade as an empty or globally resolved inbox', () => {
  const source = read('src/pages/SuperAdminPanel.jsx');
  const inbox = source.slice(source.indexOf('function SuggestionsView()'));
  assert.match(inbox, /setLoadError\('No se pudo leer el feedback/);
  assert.match(inbox, /Hasta 100 envíos más recientes, no el historial completo/);
  assert.match(inbox, /Este buzón no incluye chats privados/);
  assert.ok(inbox.indexOf('{loadError ? (') < inbox.indexOf(') : filtered.length === 0 ? ('));
  assert.match(inbox, /Reintentar lectura/);
});

test('both audit agents feed the Super Admin diagnostics archive and Caja Negra documents the flow', () => {
  const panel = read('src/pages/SuperAdminPanel.jsx');
  const diagnostics = panel.slice(panel.indexOf('function DiagnosticsView()'));
  assert.match(diagnostics, /Diagnóstico integral de Causa OS/);
  assert.match(diagnostics, /CausaAuditorAgent/);
  assert.match(diagnostics, /platform_diagnostic_reports/);

  const agent = read('.github/agents/causa-auditor-integridad.agent.md');
  assert.match(agent, /Super Admin → Diagnósticos/);
  assert.match(agent, /no tiene autorización implícita para escribir directamente en Firestore ni en Nodus/);

  const blackBox = read('docs/caja_negra_operativa_cpsl.md');
  assert.match(blackBox, /13\.6\. Auditorías y archivo de diagnósticos/);
  assert.match(blackBox, /platform_diagnostic_reports/);
});

test('pending-audit agent covers all unresolved domains with strict read-only execution limits', () => {
  const agent = read('.github/agents/causa-auditoria-pendientes.agent.md');
  for (const coverage of [
    'Permisos y segregación por sede/rol',
    'Consistencia de tareas, progreso y colaboración',
    'Nodus, paginación, sincronización y trazabilidad',
    'Conversión, pagos y caja',
    'Futuro Imposible y Equipo 1000',
    'Palabra Rota, pólizas y correo',
    'Interfaz y calidad visible',
    'Estado de los agentes y workflows',
  ]) {
    assert.ok(agent.includes(coverage), `agent covers ${coverage}`);
  }
  assert.match(agent, /no permanece ejecutándose en segundo plano/);
  assert.match(agent, /No cambiar ni desplegar reglas/);
  assert.match(agent, /No iniciar workflows manuales/);
  assert.match(agent, /NO VERIFICABLE/);
  assert.match(read('docs/caja_negra_operativa_cpsl.md'), /causa-auditoria-pendientes\.agent\.md/);
});

test('executive missing definitions cannot use a generic operational input form', () => {
  const source = read('src/pages/MisKPIs.jsx');
  assert.match(source, /selectedPerson\?\.tabCategory === 'ejecutivo'[\s\S]*?No se puede registrar un KPI personal ejecutivo/);
  for (const tab of ['c1', 'mj', 'capitan', 'qt']) {
    assert.ok(source.includes(`selectedPerson?.tabCategory !== 'ejecutivo' && activeTab === '${tab}'`));
  }
  assert.match(read('src/components/ModuleQuickAccess.jsx'), /no es un ranking global de usuarios/);
});

test('calendar attachments carry the optional declared location using ICS escaping', () => {
  assert.match(read('scripts/mailerDaemon.js'), /LOCATION:\$\{escapeIcsText\(calendarEvent\.location \|\| ''\)\}/);
});
