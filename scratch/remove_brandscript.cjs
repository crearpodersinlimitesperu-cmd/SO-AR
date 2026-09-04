const fs = require('fs');
const path = require('path');

const file = path.join('c:', 'Users', 'josem', 'Downloads', 'SO-AR', 'src', 'pages', 'EmbudoConversionBoard.jsx');
let content = fs.readFileSync(file, 'utf8');

// Eliminar el tab button
content = content.replace(/{ id: 'brandscript'.*?\n/g, '');

// Eliminar el bloque de la pestana
const startMarker = "{/* PESTAÑA DE BRANDSCRIPT Y GUIONES MJ */}";
const endMarker = "    </div>\n  );\n}";
const startIndex = content.indexOf(startMarker);
const endIndex = content.lastIndexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    content = content.substring(0, startIndex) + endMarker;
}

// Remover BookOpen import si existe
content = content.replace(/ BookOpen, /g, ' ');
content = content.replace(/, BookOpen/g, '');
content = content.replace(/BookOpen, /g, '');

fs.writeFileSync(file, content, 'utf8');
console.log("Completado");
