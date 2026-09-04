import fs from 'fs';

// Let's read parseCSV and mapRowsToQTMembers code from src/services/qtSheetService.js
let code = fs.readFileSync('src/services/qtSheetService.js', 'utf8');
// Strip imports
code = code.replace(/import .*/g, '');
code += 
const csv = fs.readFileSync('scratch/qts.csv', 'utf8');
const rows = parseCSV(csv);
const members = mapRowsToQTMembers(rows);
console.log('Total mapped members from CSV:', members.length);
const gina = members.find(m => m.email.includes('cardenas') || m.nombre.toLowerCase().includes('gina'));
console.log('Gina mapped:', JSON.stringify(gina, null, 2));
;
fs.writeFileSync('scratch/test_standalone.cjs', code);