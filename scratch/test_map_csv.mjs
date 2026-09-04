import fs from 'fs';
import { parseCSV, mapRowsToQTMembers } from '../src/services/qtSheetService.js';

const csv = fs.readFileSync('scratch/qts.csv', 'utf8');
const rows = parseCSV(csv);
const members = mapRowsToQTMembers(rows);

console.log('Total mapped members from CSV:', members.length);
const gina = members.find(m => m.email.includes('cardenas') || m.nombre.toLowerCase().includes('gina'));
console.log('Gina mapped:', gina);
const rouse = members.find(m => m.email.includes('rouz') || m.nombre.toLowerCase().includes('rosmery'));
console.log('Rouse mapped:', rouse);