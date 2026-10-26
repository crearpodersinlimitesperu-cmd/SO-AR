import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';

test('1. Visibilidad de Entrenador para Coordinadores (C1, C2, MJ y Sedes)', () => {
  const homeCode = fs.readFileSync('src/pages/Home.jsx', 'utf8');

  // Verificar que la definición de isCoordinator incluye todos los roles de coordinación
  assert.match(
    homeCode,
    /isCoordinator\s*=\s*isCoordC1C2\s*\|\|\s*isCoordMJ/,
    'isCoordinator debe incluir roles de coordinación'
  );

  // Verificar que canSeeTrainer NO está restringido por isEventInActiveCycle para coordinadores
  assert.match(
    homeCode,
    /canSeeTrainer\s*=\s*canAlwaysSeeTrainer\s*\|\|\s*isCoordinator/,
    'canSeeTrainer debe permitir visibilidad directa a coordinadores sin bloquear por ciclo'
  );

  // Verificar que en la lista de eventos filtrados los coordinadores tienen acceso a su sede
  assert.match(
    homeCode,
    /if\s*\(\s*isCoordinator\s*\)\s*\{[\s\S]*?Ven todos los eventos/,
    'Los coordinadores deben tener regla explícita para ver todos los eventos de su sede'
  );
});

test('2. Aviso Institucional de Confidencialidad Estricta en Módulos de Calendario y Eventos', () => {
  const homeCode = fs.readFileSync('src/pages/Home.jsx', 'utf8');
  const teamCalendarCode = fs.readFileSync('src/pages/TeamCalendar.jsx', 'utf8');
  const calMJCode = fs.readFileSync('src/pages/CalendarioMJ.jsx', 'utf8');

  // En Home.jsx (Eventos y Entrenamientos)
  assert.ok(homeCode.includes('ESTRICTAMENTE CONFIDENCIAL'), 'Home.jsx debe contener el badge ESTRICTAMENTE CONFIDENCIAL');
  assert.ok(homeCode.includes('Aviso Oficial de Confidencialidad y Uso Reservado'), 'Home.jsx debe tener el título de confidencialidad');
  assert.ok(homeCode.includes('PROHIBIDA SU DIVULGACIÓN SIN AUTORIZACIÓN'), 'Home.jsx debe incluir prohibición expresa de divulgación');

  // En TeamCalendar.jsx
  assert.ok(teamCalendarCode.includes('ESTRICTAMENTE CONFIDENCIAL'), 'TeamCalendar.jsx debe contener el badge ESTRICTAMENTE CONFIDENCIAL');
  assert.ok(teamCalendarCode.includes('Aviso Oficial de Confidencialidad y Uso Reservado'), 'TeamCalendar.jsx debe tener el título de confidencialidad');

  // En CalendarioMJ.jsx
  assert.ok(calMJCode.includes('ESTRICTAMENTE CONFIDENCIAL'), 'CalendarioMJ.jsx debe contener el badge ESTRICTAMENTE CONFIDENCIAL');
  assert.ok(calMJCode.includes('Aviso Oficial de Confidencialidad y Uso Reservado'), 'CalendarioMJ.jsx debe tener el título de confidencialidad');
});
