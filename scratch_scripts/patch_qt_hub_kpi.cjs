const fs = require('fs');
const file = 'src/pages/QuantumTeamHub.jsx';
let content = fs.readFileSync(file, 'utf8');

const importTarget = "import ChecklistBoard from './ChecklistBoard';";
const importReplacement = "import ChecklistBoard from './ChecklistBoard';\nimport { qtKpis } from '../data/qtKpis';\nimport { collection, addDoc, serverTimestamp } from 'firebase/firestore';\nimport { db } from '../services/firebase';";
content = content.replace(importTarget, importReplacement);

const kpiSection = `
        {/* BLOQUE KPI (Oculto a menos que haya KPIs para este correo) */}
        {qtKpis[currentUser?.email] && (
          <div style={{ background: '#1e1b4b', borderRadius: '16px', border: '1px solid #4f46e5', padding: '1.5rem', marginTop: '1rem' }}>
            <h2 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: '1.2rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>📊 Mis KPIs de Piso</span>
              <span style={{ fontSize: '0.85rem', background: '#3730a3', padding: '4px 10px', borderRadius: '12px' }}>{qtKpis[currentUser?.email].evento}</span>
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.8rem' }}>
              {Object.entries(qtKpis[currentUser?.email].metrics).map(([key, val]) => (
                <div key={key} style={{ background: '#111827', padding: '0.8rem', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ color: '#818cf8', fontSize: '0.75rem', fontWeight: 800 }}>{key}</div>
                  <div style={{ color: key === 'PP' ? '#10b981' : '#fff', fontSize: '1.2rem', fontWeight: 900, marginTop: '4px' }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ADMIN OVERRIDE PARA ENVIAR MAILS */}
        {currentUser?.isSuperAdmin && (
          <button 
            onClick={async () => {
              for (const [email, person] of Object.entries(qtKpis)) {
                await addDoc(collection(db, 'mail'), {
                  to: email,
                  message: {
                    subject: \`[Feedback QT] Reporte Oficial \${person.evento} - \${person.name}\`,
                    html: \`<p>Hola <strong>\${person.name}</strong>,</p><p>Te compartimos los KPIs oficiales de tu gestion en piso para el entrenamiento <strong>\${person.evento}</strong>. Entra a Causa OS (Hub Operativo QT) para revisarlos a detalle.</p><p>Tu conversion (PP): <strong>\${person.metrics.PP}</strong></p>\`
                  },
                  createdAt: serverTimestamp()
                });
                toast.success(\`Correo encolado para \${person.name}\`);
              }
            }}
            style={{ marginTop: '1rem', background: '#ef4444', color: '#fff', padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Administrador: Disparar Correos QT a Cola (Nodemailer)
          </button>
        )}
`;

const insertionPoint = "{/* BLOQUE 4: LEGACY WRAPPER */}";
content = content.replace(insertionPoint, kpiSection + '\n        ' + insertionPoint);

fs.writeFileSync(file, content);
console.log('QuantumTeamHub patched with KPI section');
