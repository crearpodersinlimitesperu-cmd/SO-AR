const fs = require('fs');
const file = 'public/cartas/carta_invitacion_migraciones.html';
let content = fs.readFileSync(file, 'utf8');

// Add Cirilo to TRAINERS_MASTER
const target = "'ERNESTO ALEJANDRO DIAZ PABON': {";
const replacement = `'CIRILO AGUSTIN MARTINEZ': {
                name: 'CIRILO AGUSTIN MARTINEZ',
                nacionalidad: 'MEXICANA',
                doc: 'PASAPORTE MEXICANO',
                fechas: 'Del 15 al 19 de Octubre de 2026',
                rol: 'Líder Capítulo Uno (Invitado Internacional Ad-Honorem)',
                hotel: 'Hotel José Antonio Deluxe (Calle Bellavista 133, Miraflores, Lima)'
            },
            'ERNESTO ALEJANDRO DIAZ PABON': {`;

if (content.includes("ERNESTO ALEJANDRO DIAZ PABON") && !content.includes("CIRILO AGUSTIN MARTINEZ")) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content);
  console.log("Cirilo added to TRAINERS_MASTER in carta_invitacion_migraciones.html");
} else {
  console.log("Failed or already added.");
}
