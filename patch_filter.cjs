const fs = require('fs');
const path = 'src/pages/Home.jsx';
let code = fs.readFileSync(path, 'utf8');

const filterRegex = /\/\/ 5\. Filtro tab locales vs globales para Gerentes y Directivos[\s\S]*?if \(activeEventTab === 'locales'\) \{[\s\S]*?return evSede\.toLowerCase\(\)\.includes\(userSede\.toLowerCase\(\)\) \|\| userSede\.toLowerCase\(\)\.includes\(evSede\.toLowerCase\(\)\);\n                      \}/;

const newFilter = `// 5. Filtro explícito de sedes para roles Directivos/Gerenciales/SuperAdmin
                      if (isSuperOrDir || isGerente) {
                        const evSede = (ev.sede || ev.sedeTag || '').toLowerCase();
                        if (selectedSedeFilter === 'todas') return true;
                        
                        if (selectedSedeFilter === 'misede') {
                          const userSede = (currentUser?.sede || '').toLowerCase();
                          if (!userSede || userSede.includes('global')) return true;
                          return evSede.includes(userSede) || userSede.includes(evSede);
                        }
                        
                        return evSede.includes(selectedSedeFilter);
                      }`;

code = code.replace(filterRegex, newFilter);
fs.writeFileSync(path, code);
