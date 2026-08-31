const fs = require('fs');
let buf = fs.readFileSync('src/data/usersData.js');
let idx = buf.indexOf(Buffer.from('direcci', 'utf8'));
if (idx !== -1) {
    let slice = buf.slice(idx, idx + 10);
    console.log(slice);
}
