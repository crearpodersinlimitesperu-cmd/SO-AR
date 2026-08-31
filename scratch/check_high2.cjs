const fs = require('fs');
let str = fs.readFileSync('src/data/usersData.js', 'utf8');
let highChars = new Set();
for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) > 255) {
        highChars.add(str.charAt(i));
    }
}
console.log('High codepoints in usersData.js:', Array.from(highChars));
