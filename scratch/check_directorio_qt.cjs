const fs = require('fs');
console.log(fs.readFileSync('src/pages/DirectorioQT.jsx', 'utf8').substring(0, 1000));