const fs = require('fs');

const path = 'src/data/usersToImport.js';
let content = fs.readFileSync(path, 'utf8');

// The issue is that the text was UTF-8, interpreted as ISO-8859-1 (Latin1), and then re-saved as UTF-8.
// We can fix this by converting the string to Latin1 bytes, and then parsing those bytes as UTF-8.

function fixDoubleEncoding(str) {
    try {
        return Buffer.from(str, 'latin1').toString('utf8');
    } catch (e) {
        return str;
    }
}

// But wait, the source code might have a mix of properly encoded things and badly encoded things.
// Actually, let's just do a blanket replace for the known bad sequences.
// Or we can parse the JSON (it's a JS file, so we have to use string replacements or eval it).
// Let's just fix the whole string by converting to latin1 and back to utf8.
// Let's see if that works on a test string.
let test = "MarÃ­a De Lourdes PatiÃ±o PatiÃ±o Galarraga";
console.log(Buffer.from(test, 'latin1').toString('utf8'));

