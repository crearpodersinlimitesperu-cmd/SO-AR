import { useNavigate } from 'react-router-dom';
import { roles } from '../data/checklistData';

export default function RoleSelector() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '2rem', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <div className="glass-panel" style={{ padding: '3rem', maxWidth: '600px', width: '100%', textAlign: 'center' }}>
        <img src="https://crearpsl.net/logo_crear_blanco.png" alt="CREAR PODER SIN LIMITES" className="logo-holographic" style={{ width: '150px', margin: '0 auto 1.5rem', display: 'block' }} onError={(e) => e.target.style.display = 'none'} />
        <h1 className="text-gold" style={{ marginBottom: '1rem', letterSpacing: '2px' }}>SELECCIONA TU ROL</h1>
        <p className="text-muted" style={{ marginBottom: '2.5rem' }}>
          Para ingresar al checklist operativo, por favor selecciona tu rol en el equipo.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
          {roles.map(role => (
            <button
              key={role.id}
              className={role.id === 'gerente' ? "btn-primary" : "btn-secondary"}
              style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
              onClick={() => {
                if (role.id === 'gerente') {
                  navigate('/gerente');
                } else {
                  navigate(`/checklist/${role.id}`);
                }
              }}
            >
              {role.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
