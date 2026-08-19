import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';

export default function Login() {
  const { currentUser, loginWithGoogle } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate('/home');
    }
  }, [currentUser, navigate]);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
      // La redirección la maneja el useEffect cuando currentUser cambia
    } catch (error) {
      console.error("Error al iniciar sesión", error);
      showToast(error.message || "Hubo un error al iniciar sesión. Intenta nuevamente.", "error");
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-dark)' }}>
      <div className="glass-panel" style={{ padding: '4rem', maxWidth: '500px', width: '100%', textAlign: 'center' }}>
        <img src="https://crearpsl.net/logo_crear_blanco.png" alt="CREAR PODER SIN LIMITES" className="logo-holographic" style={{ width: '200px', margin: '0 auto 2rem', display: 'block' }} onError={(e) => e.target.style.display = 'none'} />
        
        <h1 className="text-gold uppercase" style={{ fontSize: '2rem', marginBottom: '0.5rem', letterSpacing: '2px' }}>CENTRO OPERATIVO</h1>
        <p className="text-muted" style={{ marginBottom: '3rem', fontSize: '1.1rem' }}>Plataforma de Gestión por Ciclos</p>
        
        <button 
          onClick={handleLogin}
          className="btn-primary" 
          style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.8rem' }}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '24px', height: '24px', background: 'white', borderRadius: '50%', padding: '2px' }} />
          Continuar con Google
        </button>
        
        <p className="text-muted" style={{ marginTop: '2rem', fontSize: '0.8rem' }}>Acceso exclusivo para equipo CREAR</p>
      </div>
    </div>
  );
}
