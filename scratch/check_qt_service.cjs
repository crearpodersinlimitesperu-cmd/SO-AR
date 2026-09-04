const fs = require('fs');
console.log(fs.readFileSync('src/services/qtSheetService.js', 'utf8').substring(0, 1000));