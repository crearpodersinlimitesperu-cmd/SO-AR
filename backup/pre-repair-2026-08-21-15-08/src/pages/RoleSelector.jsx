import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_DISPLAY_NAMES } from '../data/usersData';

export default function RoleSelector() {
  const navigate = useNavigate();
  const { currentUser, switchRole } = useAuth();

  const handleRoleSelect = (roleId) => {
    switchRole(roleId);
    if (roleId === 'gerente') {
      navigate('/gerente');
    } else if (roleId === 'global' || roleId === 'consolidado') {
      navigate('/home');
    } else {
      navigate(`/checklist/${roleId}`);
    }
  };

  // Extract roles from current user, fallback if none
  let userRoles = [];
  if (currentUser?.roles && currentUser.roles.length > 0) {
    userRoles = currentUser.roles;
  } else if (currentUser?.appRole) {
    userRoles = [currentUser.appRole];
  } else {
    // If somehow no roles, fallback to these common ones to not block them
    userRoles = ['gerente', 'coord_c1', 'coord_maestria', 'capitan', 'qt', 'entrenador'];
  }
  // Define strict hierarchy order (lower index = higher priority)
  const roleHierarchy = [
    'direccion', 'cfo', 'gerente', 'director_maestria', 
    'coord_c1', 'coord_maestria', 'capitan', 'manager',
    'entrenador', 'entrenador_llamadas', 'qt',
    'finanzas', 'coordinador', 'talento_humano', 'legal', 'asistente_impuestos_quito', 'tecnico_sst'
  ];

  userRoles = Array.from(new Set(userRoles)).sort((a, b) => {
    const idxA = roleHierarchy.indexOf(a);
    const idxB = roleHierarchy.indexOf(b);
    if (idxA === -1 && idxB === -1) return a.localeCompare(b);
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  return (

    <div style={{ padding: '2rem', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <div className="glass-panel" style={{ padding: '3rem', maxWidth: '600px', width: '100%', textAlign: 'center' }}>
        <img src="https://crearpsl.net/logo_crear_blanco.png" alt="CREAR PODER SIN LIMITES" className="logo-holographic" style={{ width: '150px', margin: '0 auto 1.5rem', display: 'block' }} onError={(e) => e.target.style.display = 'none'} />
        <h1 className="text-gold" style={{ marginBottom: '1rem', letterSpacing: '2px' }}>SELECCIONA TU ROL</h1>
        <p className="text-muted" style={{ marginBottom: '2.5rem' }}>
          Para ingresar al checklist operativo, por favor selecciona el rol con el que deseas interactuar.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
          {userRoles.length > 1 && (
            <button
              className="btn-primary"
              style={{ width: '100%', padding: '1.2rem', fontSize: '1.2rem', background: 'linear-gradient(45deg, #d4af37, #f5d565)', color: '#111', fontWeight: 'bold' }}
              onClick={() => handleRoleSelect('consolidado')}
            >
              VISTA CONSOLIDADA (GLOBAL)
            </button>
          )}

          {userRoles.map(role => (
            <button
              key={role}
              className="btn-secondary"
              style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', borderColor: '#4b5563' }}
              onClick={() => handleRoleSelect(role)}
            >
              Vista de: {ROLE_DISPLAY_NAMES[role] || role.toUpperCase()}
            </button>
          ))}
          
          <button
            className="btn-secondary"
            style={{ width: '100%', padding: '1rem', fontSize: '1rem', marginTop: '1rem', opacity: 0.7 }}
            onClick={() => navigate('/home')}
          >
            Ir al Dashboard (Home)
          </button>
        </div>
      </div>
    </div>
  );
}
