import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';

test('GeneradorFlyer defaults to C1 phase mode without blocking export error', () => {
  const flyerCode = fs.readFileSync('src/pages/GeneradorFlyer.jsx', 'utf8');

  // Must default porEquipo to false so clicking 'Flyers C1 Globales' opens C1 immediately
  assert.match(
    flyerCode,
    /const\s*\[porEquipo,\s*setPorEquipo\]\s*=\s*useState\(false\);/,
    'porEquipo must default to false so C1 flyer is accessible immediately without team errors'
  );

  // Must derive userSedeCode from user.sede
  assert.match(
    flyerCode,
    /userSedeCode[\s\S]*?s\.includes\('cuenca'\)[\s\S]*?return 'cue'/,
    'userSedeCode must map Cuenca to cue'
  );

  // Must initialize equipoSedeId and sedeIndividualId with userSedeCode
  assert.match(
    flyerCode,
    /const\s*\[equipoSedeId,\s*setEquipoSedeId\]\s*=\s*useState\(userSedeCode\);/,
    'equipoSedeId must default to userSedeCode'
  );

  assert.match(
    flyerCode,
    /const\s*\[sedeIndividualId,\s*setSedeIndividualId\]\s*=\s*useState\(userSedeCode\);/,
    'sedeIndividualId must default to userSedeCode'
  );

  // Auto-selection of first team when switching to porEquipo
  assert.match(
    flyerCode,
    /setEquipoId\(equiposDisponibles\[0\]\)/,
    'Must auto-select first available team when in porEquipo mode'
  );
});

test('Home.jsx provides direct access to Generador Flyer in Eventos y Entrenamientos', () => {
  const homeCode = fs.readFileSync('src/pages/Home.jsx', 'utf8');

  // Verify direct button in EVENTOS Y ENTRENAMIENTOS header
  assert.match(
    homeCode,
    /canAccessFlyersC1\(currentUser\)[\s\S]*?Generar Flyer Oficial/,
    'Must have a direct button to Generador Flyer in EVENTOS Y ENTRENAMIENTOS'
  );

  // Verify that the confidentiality notice clarifies official flyers usage
  assert.match(
    homeCode,
    /Flyers Oficiales/,
    'Confidentiality banner must clarify that public promotion is done via official flyers'
  );
});
