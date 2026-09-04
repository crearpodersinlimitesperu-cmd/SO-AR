const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.jsx', 'utf8');

// Restore MODULE_REGISTRY
code = code.replace(
  "{ id: 'calendario-equipo', label: 'Agenda y Time Boxing', emoji: '🗓️', route: '/calendario-equipo', roles: EXEC_ROLES }",
  "{ id: 'calendario-equipo', label: 'Agenda y Time Boxing', emoji: '🗓️', route: '/calendario-equipo', roles: null }"
);

// Try to find the exact block for the dropdown button and replace it
let targetBlock = "{(currentUser?.isSuperAdmin || currentUser?.appRole === 'gerente' || currentUser?.isDireccion || currentUser?.appRole === 'director_maestria' || ['coordinador', 'coord_c1', 'coord_c2', 'coordinador_c1c2'].includes(currentUser?.appRole)) && (\n                <button onClick={() => { setShowToolsDropdown(false); navigate('/calendario-equipo'); }} className=\"btn-secondary\" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start', color: '#f97316', background: 'rgba(249, 115, 22, 0.1)' }}>\n                  🗓️ Agenda y Time Boxing\n                </button>\n              )}";

let replacement = "<button onClick={() => { setShowToolsDropdown(false); navigate('/calendario-equipo'); }} className=\"btn-secondary\" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start', color: '#f97316', background: 'rgba(249, 115, 22, 0.1)' }}>\n                  🗓️ Agenda y Time Boxing\n                </button>";

if (code.includes(targetBlock)) {
   code = code.replace(targetBlock, replacement);
   console.log("Restored dropdown block");
} else {
   console.log("Could not find dropdown block exactly");
}

fs.writeFileSync('src/pages/Home.jsx', code, 'utf8');