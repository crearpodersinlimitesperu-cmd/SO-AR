const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.jsx', 'utf8');
code = code.replace(
  />🎨 Generador Flyers</,
  ' title="Generador de Flyers Oficiales para Capítulos Uno">🎨 Flyers C1 Globales<'
);
fs.writeFileSync('src/pages/Home.jsx', code, 'utf8');
