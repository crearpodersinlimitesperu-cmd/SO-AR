const map = {
    'Ã¡': 'á', 'Ã©': 'é', 'Ã\xad': 'í', 'Ã³': 'ó', 'Ãº': 'ú', 'Ã±': 'ñ', 'Ã¼': 'ü',
    'Ã ': 'Á', 'Ã‰': 'É', 'Ã\x8d': 'Í', 'Ã“': 'Ó', 'Ãš': 'Ú', 'Ã‘': 'Ñ', 'Ãœ': 'Ü'
};
const fs = require('fs');
let str = fs.readFileSync('src/data/usersData.js', 'utf8');
for (let key in map) {
    str = str.split(key).join(map[key]);
}
fs.writeFileSync('src/data/usersData.js', str, 'utf8');
