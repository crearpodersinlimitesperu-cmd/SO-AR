const fs = require('fs');
const file = 'src/pages/Home.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add to Herramientas de Operación (around line 2057)
const dropdownTarget = `                  <button onClick={() => { setShowToolsDropdown(false); navigate('/superadmin'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start' }}>
                    🌐 Centro de Mando
                  </button>
                )}`;
const dropdownInsert = `
                {isDataAdmin(currentUser) && (
                  <button onClick={() => { setShowToolsDropdown(false); navigate('/legal-admin'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)' }}>
                    ⚖️ Auditoría Legal
                  </button>
                )}`;

if (content.includes(dropdownTarget) && !content.includes('⚖️ Auditoría Legal')) {
  content = content.replace(dropdownTarget, dropdownTarget + dropdownInsert);
}

// 2. Add to BARRA PRO COMPLETA (around line 2181)
const proBarTarget = `            <button onClick={() => navigate('/superadmin')} className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #8b5cf6, #29abe2)', color: 'white', border: 'none' }}>
              🌐 Centro de Mando
            </button>
          )}`;
const proBarInsert = `
          {isDataAdmin(currentUser) && (
            <button onClick={() => navigate('/legal-admin')} className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#fbbf24', border: '1px solid #fbbf24' }}>
              ⚖️ Auditoría Legal
            </button>
          )}`;

if (content.includes(proBarTarget) && !content.includes('⚖️ Auditoría Legal"')) {
  content = content.replace(proBarTarget, proBarTarget + proBarInsert);
}

fs.writeFileSync(file, content);
console.log('Botones inyectados en la interfaz');
