const fs = require('fs');
const path = 'src/pages/Home.jsx';
let code = fs.readFileSync(path, 'utf8');

const oldLogic = `if (activeEventTab === 'locales') {
                        const userSede = currentUser?.sede || '';
                        if (!userSede || userSede.toLowerCase().includes('global')) return true;
                        const evSede = ev.sede || ev.sedeTag || '';
                        if (!evSede) return false;
                        return evSede.toLowerCase().includes(userSede.toLowerCase()) || userSede.toLowerCase().includes(evSede.toLowerCase());
                      }`;

const newLogic = `if (isSuperOrDir || isGerente) {
                        const evSede = (ev.sede || ev.sedeTag || '').toLowerCase();
                        if (selectedSedeFilter === 'todas') return true;
                        if (selectedSedeFilter === 'misede') {
                          const userSede = (currentUser?.sede || '').toLowerCase();
                          if (!userSede || userSede.includes('global')) return true;
                          return evSede.includes(userSede) || userSede.includes(evSede);
                        }
                        return evSede.includes(selectedSedeFilter);
                      }`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync(path, code);
