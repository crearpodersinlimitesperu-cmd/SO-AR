const fs = require('fs');
const content = fs.readFileSync('src/pages/GerenteDashboard.jsx', 'utf8');

const horarioCode = 
      {/* SECCIÓN DE HORARIOS (Añadido 03/09/2026) */}
      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.4rem', color: 'var(--text-heading)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
          <Clock size={22} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
          Horarios de Entrenamientos (Lima)
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          
          {/* CAPIÍTULO UNO */}
          <div className="glass-panel" style={{ padding: '1.2rem', borderTop: '4px solid #8b5cf6' }}>
            <h3 style={{ color: '#8b5cf6', marginTop: 0, marginBottom: '1rem' }}>Capítulo UNO</h3>
            <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Jueves</td>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>4:30 PM - Cierre</td>
                  <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>Negro</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Viernes</td>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>7:30 AM - 3 PM<br/>5 PM - Cierre</td>
                  <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>Negro formal</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Sábado</td>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>8 AM - 4 PM<br/>3 PM - Cierre</td>
                  <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>Polo/pantalón negro</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Domingo</td>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>8 AM - Cierre</td>
                  <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>Polo/pantalón negro</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* CAPÍTULO DOS */}
          <div className="glass-panel" style={{ padding: '1.2rem', borderTop: '4px solid #29abe2' }}>
            <h3 style={{ color: '#29abe2', marginTop: 0, marginBottom: '1rem' }}>Capítulo DOS</h3>
            <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Jueves</td>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>10:30 AM - 4 PM<br/>4 PM - Cierre</td>
                  <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>Negro formal</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Viernes</td>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>7:15 AM - 4 PM<br/>4 PM - Cierre</td>
                  <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>Polo/pantalón negro</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Sábado</td>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>7:30 AM - 3 PM<br/>3 PM - Cierre</td>
                  <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>Polo/pantalón negro</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Domingo</td>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Inicio - Cierre<br/>3 PM - Cierre</td>
                  <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>Polo/pantalón negro</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* MAESTRÍA */}
          <div className="glass-panel" style={{ padding: '1.2rem', borderTop: '4px solid #f59e0b' }}>
            <h3 style={{ color: '#f59e0b', marginTop: 0, marginBottom: '1rem' }}>Maestría del Juego</h3>
            <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Viernes</td>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>3:00 PM - 9 PM</td>
                  <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>Negro formal</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Sábado</td>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>8:30 AM - 12 PM<br/>4 PM - 9 PM</td>
                  <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>Camiseta/pantalón negro</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Domingo</td>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>8:30 AM - 12 PM<br/>4 PM - Cierre</td>
                  <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>Camiseta/pantalón negro</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>
;

const updatedContent = content.replace(
  '      <TaskAssignmentModal isOpen={showTaskForm} onClose={() => setShowTaskForm(false)} />\n      <VenueConfigModal isOpen={showVenueModal} onClose={() => setShowVenueModal(false)} />',
  '      <TaskAssignmentModal isOpen={showTaskForm} onClose={() => setShowTaskForm(false)} />\n      <VenueConfigModal isOpen={showVenueModal} onClose={() => setShowVenueModal(false)} />\n' + horarioCode
);

fs.writeFileSync('src/pages/GerenteDashboard.jsx', updatedContent, 'utf8');
