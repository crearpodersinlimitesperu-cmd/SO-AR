const map = {
    'Ã¡': 'á', 'Ã©': 'é', 'Ã\xad': 'í', 'Ã³': 'ó', 'Ãº': 'ú', 'Ã±': 'ñ', 'Ã¼': 'ü',
    'Ã ': 'Á', 'Ã‰': 'É', 'Ã\x8d': 'Í', 'Ã“': 'Ó', 'Ãš': 'Ú', 'Ã‘': 'Ñ', 'Ãœ': 'Ü'
};
const fs = require('fs');
let str = fs.readFileSync('src/data/usersToImport.js', 'utf8');
for (let key in map) {
    str = str.split(key).join(map[key]);
}
fs.writeFileSync('src/data/usersToImport.js', str, 'utf8');

let str2 = fs.readFileSync('src/data/managersData.js', 'utf8');
for (let key in map) {
    str2 = str2.split(key).join(map[key]);
}
fs.writeFileSync('src/data/managersData.js', str2, 'utf8');
