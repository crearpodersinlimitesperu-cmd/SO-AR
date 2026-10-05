const fs = require('fs');

let content = fs.readFileSync('src/services/cmjDataService.js', 'utf8');

const mappingCode = `
const TEAM_NAMES_MAPPING = {
  'LIMA CICLO 1': {
    30: { nombre: 'TINKUY RURAY' },
    29: { nombre: 'QUANTUM PHOENIX' },
    28: { nombre: 'UBUNTU' },
    27: { nombre: 'KAY THERON' }
  }
};
`;

if (!content.includes('TEAM_NAMES_MAPPING')) {
  content = content.replace('export function getAllEquipos() {', mappingCode + '\nexport function getAllEquipos() {');
  
  // Inject equipoName mapping
  content = content.replace(
    'equipoLabel: `Equipo ${eqNum}`,',
    'equipoLabel: `Equipo ${eqNum}`, equipoName: (TEAM_NAMES_MAPPING[sede] && TEAM_NAMES_MAPPING[sede][eqNum]) ? TEAM_NAMES_MAPPING[sede][eqNum].nombre : `Equipo ${eqNum}`,'
  );
  
  fs.writeFileSync('src/services/cmjDataService.js', content, 'utf8');
  console.log('Patched cmjDataService.js with TEAM_NAMES_MAPPING');
} else {
  console.log('Already patched');
}
