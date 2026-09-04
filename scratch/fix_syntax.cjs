const fs = require('fs');
let code = fs.readFileSync('src/pages/GerenteDashboard.jsx', 'utf8');

// The replacement bug caused \n to literally be written as \n in the file.
code = code.replace('\\\\n      {/* SECCION DE HORARIOS */}', '      {/* SECCION DE HORARIOS */}');
code = code.replace('\\n      {/* SECCION DE HORARIOS */}', '      {/* SECCION DE HORARIOS */}');

fs.writeFileSync('src/pages/GerenteDashboard.jsx', code, 'utf8');
