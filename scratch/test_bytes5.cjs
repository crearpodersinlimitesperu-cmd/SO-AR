const fs = require('fs');
let buf = fs.readFileSync('src/data/usersData.js');
let str = buf.toString('utf8');
let idx = str.indexOf('direcci');
while(idx !== -1) {
    console.log(Buffer.from(str.substring(idx, idx + 10), 'utf8'));
    idx = str.indexOf('direcci', idx + 1);
}
