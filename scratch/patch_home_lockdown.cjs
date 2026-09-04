const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.jsx', 'utf8');

// Update MODULE_REGISTRY roles
code = code.replace(
  "{ id: 'acuerdos', label: 'Acuerdos Oficiales (Correo)', emoji: '✉️', route: '/acuerdos', roles: null }",
  "{ id: 'acuerdos', label: 'Acuerdos Oficiales (Correo)', emoji: '✉️', route: '/acuerdos', roles: EXEC_ROLES }"
);
code = code.replace(
  "{ id: 'learning', label: 'Inteligencia Colectiva (Learning)', emoji: '🧠', route: '/learning', roles: null }",
  "{ id: 'learning', label: 'Inteligencia Colectiva (Learning)', emoji: '🧠', route: '/learning', roles: EXEC_ROLES }"
);
code = code.replace(
  "{ id: 'excelencia', label: 'Excelencia Operativa', emoji: '👑', route: '/excelencia', roles: null }",
  "{ id: 'excelencia', label: 'Excelencia Operativa', emoji: '👑', route: '/excelencia', roles: EXEC_ROLES }"
);
code = code.replace(
  "{ id: 'generador-flyer', label: 'Generador de Flyers Oficiales', emoji: '🎨', route: '/generador-flyer', roles: null }",
  "{ id: 'generador-flyer', label: 'Generador de Flyers Oficiales', emoji: '🎨', route: '/generador-flyer', roles: [...EXEC_ROLES, 'coordinador', 'coord_c1', 'coord_c2', 'coordinador_c1c2'] }"
);

// We should also patch CAUSA_OPTIONS_REGISTRY
code = code.replace(
  "route: '/generador-flyer',\n      roles: null",
  "route: '/generador-flyer',\n      roles: [...EXEC_ROLES, 'coordinador', 'coord_c1', 'coord_c2', 'coordinador_c1c2']"
);
code = code.replace(
  "route: '/acuerdos',\n      roles: null",
  "route: '/acuerdos',\n      roles: EXEC_ROLES"
);
code = code.replace(
  "route: '/learning',\n      roles: null",
  "route: '/learning',\n      roles: EXEC_ROLES"
);
code = code.replace(
  "route: '/excelencia',\n      roles: null",
  "route: '/excelencia',\n      roles: EXEC_ROLES"
);

// Now patch the dropdown UI elements.
// I will wrap them using indexOf and substring.
let startAcuerdos = code.indexOf("<button onClick={() => { setShowToolsDropdown(false); navigate('/acuerdos'); }}");
let endAcuerdos = code.indexOf("</button>", startAcuerdos) + 9;
let blockAcuerdos = code.substring(startAcuerdos, endAcuerdos);
if(startAcuerdos !== -1) {
  code = code.replace(blockAcuerdos, "{(currentUser?.appRole !== 'qt') && (\n" + blockAcuerdos + "\n)}");
}

let startLearning = code.indexOf("<button onClick={() => { setShowToolsDropdown(false); navigate('/learning'); }}");
let endLearning = code.indexOf("</button>", startLearning) + 9;
let blockLearning = code.substring(startLearning, endLearning);
if(startLearning !== -1) {
  code = code.replace(blockLearning, "{(currentUser?.appRole !== 'qt') && (\n" + blockLearning + "\n)}");
}

let startExcelencia = code.indexOf("<button onClick={() => { setShowToolsDropdown(false); navigate('/excelencia'); }}");
let endExcelencia = code.indexOf("</button>", startExcelencia) + 9;
let blockExcelencia = code.substring(startExcelencia, endExcelencia);
if(startExcelencia !== -1) {
  code = code.replace(blockExcelencia, "{(currentUser?.appRole !== 'qt') && (\n" + blockExcelencia + "\n)}");
}

let startFlyerDropdown = code.indexOf("<button onClick={() => { setShowToolsDropdown(false); navigate('/generador-flyer'); }}");
let endFlyerDropdown = code.indexOf("</button>", startFlyerDropdown) + 9;
let blockFlyerDropdown = code.substring(startFlyerDropdown, endFlyerDropdown);
if(startFlyerDropdown !== -1) {
  code = code.replace(blockFlyerDropdown, "{(currentUser?.isSuperAdmin || currentUser?.appRole === 'gerente' || currentUser?.isDireccion || currentUser?.appRole === 'director_maestria' || ['coordinador', 'coord_c1', 'coord_c2', 'coordinador_c1c2'].includes(currentUser?.appRole)) && (\n" + blockFlyerDropdown + "\n)}");
}

let startCartas = code.indexOf("<a \n                    href=\"/cartas/carta_andres_idrobo_e30.html\"");
if(startCartas === -1) {
   // Let's search broadly
   startCartas = code.indexOf("Monitor de Vuelos y Cartas");
   if(startCartas !== -1) {
      startCartas = code.lastIndexOf("<a ", startCartas);
      let endCartas = code.indexOf("</a>", startCartas) + 4;
      let blockCartas = code.substring(startCartas, endCartas);
      code = code.replace(blockCartas, "{(currentUser?.appRole !== 'qt') && (\n" + blockCartas + "\n)}");
   }
}


fs.writeFileSync('src/pages/Home.jsx', code, 'utf8');
console.log("Success fully locked down Home.jsx");