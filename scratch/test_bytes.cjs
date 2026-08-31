const fs = require('fs');
let buf = fs.readFileSync('src/data/usersToImport.js');
let idx = buf.indexOf(Buffer.from('Galarraga', 'utf8'));
if (idx !== -1) {
    let slice = buf.slice(idx - 30, idx + 10);
    console.log(slice);
    console.log(slice.toString('utf8'));
}
