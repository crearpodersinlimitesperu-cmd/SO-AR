const fs = require('fs');
let str = fs.readFileSync('src/data/usersToImport.js', 'utf8');
let hasHigh = false;
for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) > 255) {
        // console.log('Found high codepoint:', str.charAt(i), 'at', i);
        hasHigh = true;
    }
}
console.log('Has high codepoints (>255)?', hasHigh);
