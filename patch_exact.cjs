const fs = require('fs');
const path = 'src/pages/Home.jsx';
let code = fs.readFileSync(path, 'utf8');

const regex = /\/\/\s*BUG REAL encontrado y corregido[\s\S]*?if \(activeEventTab === 'locales'\) \{[\s\S]*?return evSede\.toLowerCase\(\)\.includes\(userSede\.toLowerCase\(\)\) \|\| userSede\.toLowerCase\(\)\.includes\(evSede\.toLowerCase\(\)\);\s*\}/;

const replacement = `// 5. Filtro explícito de sedes para roles Directivos/Gerenciales/SuperAdmin
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

if(regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync(path, code);
    console.log("Success");
} else {
    console.log("Failed to match regex");
}
