const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.jsx', 'utf8');

// Fix the syntax error )} && ( -> ) && (
code = code.replace("))} && (", ")) && (");
code = code.replace("))} && (", ")) && (");

fs.writeFileSync('src/pages/Home.jsx', code, 'utf8');