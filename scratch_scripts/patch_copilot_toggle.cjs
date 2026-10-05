const fs = require('fs');
const path = './src/components/AICopilot.jsx';
let content = fs.readFileSync(path, 'utf8');

const oldToggle = `      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed', bottom: '20px', right: '20px',
          background: colors.primary, color: '#ffffff', border: 'none',
          borderRadius: '50px', padding: '0.8rem 1.5rem',
          display: 'flex', alignItems: 'center', gap: '0.8rem',
          boxShadow: '0 10px 25px rgba(30, 58, 138, 0.4)', cursor: 'pointer', border: \`2px solid \${colors.secondary}\`, zIndex: 9999,
          fontWeight: 'bold', fontSize: '0.95rem'
        }}
      >
        <Bot size={24} />
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span>Causa OS</span>
        </span>
      </button>`;

const newToggle = `      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed', bottom: '25px', right: '25px',
          background: 'linear-gradient(135deg, #09090b 0%, #18181b 100%)', color: '#fbbf24', border: 'none',
          borderRadius: '50px', padding: '0.9rem 1.6rem',
          display: 'flex', alignItems: 'center', gap: '0.8rem',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 15px rgba(251, 191, 36, 0.2)', cursor: 'pointer', border: \`1px solid rgba(251, 191, 36, 0.4)\`, zIndex: 9999,
          fontWeight: 800, fontSize: '1rem', letterSpacing: '0.5px'
        }}
        onMouseOver={(e) => { e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 25px rgba(251, 191, 36, 0.4)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseOut={(e) => { e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 15px rgba(251, 191, 36, 0.2)'; e.currentTarget.style.transform = 'none'; }}
      >
        <Bot size={24} color="#fbbf24" />
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ color: '#fff' }}>Causa OS</span>
        </span>
      </button>`;

content = content.replace(oldToggle, newToggle);
fs.writeFileSync(path, content, 'utf8');
console.log("Toggle button actualizado a Premium");
