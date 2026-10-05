const fs = require('fs');

const path = './src/components/FuturosImposiblesView.jsx';
let content = fs.readFileSync(path, 'utf8');

// Remove import of fake data
content = content.replace(/import\s*{\s*NODUS_FUTUROS_IMPOSIBLES_PARTICIPANTES,\s*EQUIPOS_FUTUROS_IMPOSIBLES,\s*ESTADOS_FI\s*}\s*from\s*'..\/data\/nodusFuturosImposiblesData';/, `const EQUIPOS_FUTUROS_IMPOSIBLES = ['EQUIPO 27', 'EQUIPO 28', 'EQUIPO 29', 'EQUIPO 30', 'EQUIPO 31'];
const ESTADOS_FI = { PENDIENTE: 'Pendiente', APROBADO: 'Aprobado', DEVUELTO: 'Devuelto' };`);

// Replace initial state
content = content.replace(/const \[participantesRaw, setParticipantesRaw\] = useState\(\(\) => NODUS_FUTUROS_IMPOSIBLES_PARTICIPANTES\);/, `const [participantesRaw, setParticipantesRaw] = useState([]);`);

// Replace fallback usage
content = content.replace(/setParticipantesRaw\(NODUS_FUTUROS_IMPOSIBLES_PARTICIPANTES\);/g, `setParticipantesRaw([]);`);

// Replace fallback label
content = content.replace(/detail: \`Operando con el catálogo maestro verificado \(\\\${NODUS_FUTUROS_IMPOSIBLES_PARTICIPANTES\.length} participantes PFD\)\.\`/g, `detail: 'Esperando datos en vivo de NODUS...'`);

fs.writeFileSync(path, content, 'utf8');
console.log("FuturosImposiblesView purgado de datos falsos");
