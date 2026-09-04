const fs = require('fs');
let code = fs.readFileSync('src/data/usersData.js', 'utf8');
code = code.replace("qt: 'Coordinador QT Global / QT',", "qt: 'Quantum Team (QT)',");
fs.writeFileSync('src/data/usersData.js', code, 'utf8');
console.log("Done patching usersData.js!");