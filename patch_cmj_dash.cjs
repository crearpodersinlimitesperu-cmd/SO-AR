const fs = require('fs');

const path = 'src/components/CMJDiagnosticsDashboard.jsx';
let code = fs.readFileSync(path, 'utf8');

const target = `const enrichedEquipos = mergeNodusDataIntoEquipos(getAllEquipos(), nodusData);`;
const replacement = `
          // FETCH MAESTRIA REAL DATA
          let maestriaData = null;
          try {
            const mRef = doc(db, 'nodus_kpis_sincronizados', 'maestria_real_data');
            const mSnap = await getDocResilient(mRef);
            if (mSnap.exists()) {
              maestriaData = mSnap.data().equipos_lima;
            }
          } catch(e) {
            console.error("Error fetching maestria_real_data", e);
          }
          
          const enrichedEquipos = mergeNodusDataIntoEquipos(getAllEquipos(), nodusData, maestriaData);
`;

code = code.replace(target, replacement);
fs.writeFileSync(path, code);
