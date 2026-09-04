const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.jsx', 'utf8');
code = code.replace(/currentUser\?\.appRole === 'director_maestria' \|\| currentUser\?\.appRole\?\.includes\('coord'\)/g, "currentUser?.appRole === 'director_maestria'");
fs.writeFileSync('src/pages/Home.jsx', code, 'utf8');