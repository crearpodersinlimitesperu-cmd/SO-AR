const fs = require('fs');
const path = require('path');
const homeFile = path.join('c:', 'Users', 'josem', 'Downloads', 'SO-AR', 'src', 'pages', 'Home.jsx');
let content = fs.readFileSync(homeFile, 'utf8');

// Eliminar el FileText duplicado de la linea 1 de react
content = content.replace("import { FileText, FileText, ", "import { ");
content = content.replace("import { FileText, useState", "import { useState");

// Agregar FileText a lucide-react si no está
if (content.includes("lucide-react") && !content.includes("FileText")) {
    content = content.replace("import { \n  LogOut", "import { \n  FileText, LogOut");
}

fs.writeFileSync(homeFile, content, 'utf8');
console.log("Fixed imports");
