const fs = require('fs');
const path = require('path');
const homeFile = path.join('c:', 'Users', 'josem', 'Downloads', 'SO-AR', 'src', 'pages', 'Home.jsx');
let content = fs.readFileSync(homeFile, 'utf8');

if (!content.includes("FileText, LogOut")) {
    content = content.replace("import { \n  LogOut", "import { \n  FileText, LogOut");
}

fs.writeFileSync(homeFile, content, 'utf8');
console.log("Fixed lucide imports");
