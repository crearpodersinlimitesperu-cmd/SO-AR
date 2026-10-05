const fs = require('fs');
const path = './src/components/AICopilot.jsx';
let content = fs.readFileSync(path, 'utf8');

// Update Header UI
const oldHeader = `        <div style={{ background: colors.primary, padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.5rem', borderRadius: '10px' }}>
              <Bot size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.1rem', fontWeight: 'bold' }}>Causa OS</h3>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem' }}>Copiloto Analítico & NODUS</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button onClick={() => setShowHistory(!showHistory)} style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', opacity: 0.8, padding: '0.2rem' }} title="Historial">
              <History size={18} />
            </button>
            <button onClick={startNewChat} style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', opacity: 0.8, padding: '0.2rem' }} title="Nueva Consulta">
              <PlusCircle size={18} />
            </button>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', opacity: 0.8, padding: '0.2rem', marginLeft: '0.5rem' }}>
              <X size={20} />
            </button>
          </div>
        </div>`;

const newHeader = `        <div style={{ background: 'linear-gradient(135deg, #09090b 0%, #18181b 100%)', borderBottom: '1px solid rgba(251, 191, 36, 0.2)', padding: '1.2rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', position: 'relative', overflow: 'hidden' }}>
          {/* Subtle gold glow behind title */}
          <div style={{ position: 'absolute', top: '-20px', left: '20px', width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(251, 191, 36, 0.15) 0%, rgba(0,0,0,0) 70%)', zIndex: 0 }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', zIndex: 1 }}>
            <div style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)', padding: '0.5rem', borderRadius: '10px', boxShadow: '0 0 10px rgba(251, 191, 36, 0.2)' }}>
              <Bot size={22} color="#fbbf24" />
            </div>
            <div>
              <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.15rem', fontWeight: 800, letterSpacing: '0.5px' }}>Causa OS <span style={{ fontSize: '0.65rem', background: '#fbbf24', color: '#000', padding: '2px 6px', borderRadius: '4px', verticalAlign: 'middle', marginLeft: '4px', fontWeight: 900 }}>v2</span></h3>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 5px #10b981' }}></span> Conectado a NODUS
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 1 }}>
            <button onClick={() => setShowHistory(!showHistory)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fbbf24', cursor: 'pointer', padding: '0.4rem', transition: 'all 0.2s' }} title="Historial">
              <History size={16} />
            </button>
            <button onClick={startNewChat} style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: '6px', color: '#fbbf24', cursor: 'pointer', padding: '0.4rem', transition: 'all 0.2s' }} title="Nueva Consulta">
              <PlusCircle size={16} />
            </button>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', opacity: 0.6, padding: '0.2rem', marginLeft: '0.5rem' }}>
              <X size={20} />
            </button>
          </div>
        </div>`;

content = content.replace(oldHeader, newHeader);
fs.writeFileSync(path, content, 'utf8');
console.log("Caja Negra Header Premium UI aplicado");
