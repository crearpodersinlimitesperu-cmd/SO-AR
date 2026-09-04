const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.jsx', 'utf8');

const regex = new RegExp('<button[^>]*navigate\\\\(\\'\\\\/generador-flyer\\'\\\\)[^>]*>[\\\\s\\\\S]*?<\\\\/button>', 'g');

code = code.replace(regex, (match) => {
  return "{(currentUser?.isSuperAdmin || currentUser?.appRole === 'gerente' || currentUser?.isDireccion || currentUser?.appRole === 'director_maestria' || currentUser?.appRole?.includes('coord')) && (\n" +
         match.replace('🎨 Generador Flyers', '🎨 Flyers C1 Globales')
              .replace('>', ' title=\"Generador de Flyers Oficiales para Capítulos Uno\">') +
         "\n)}";
});

fs.writeFileSync('src/pages/Home.jsx', code, 'utf8');
