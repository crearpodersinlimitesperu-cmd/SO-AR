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
    // Play lion roar!
    try {
      const audio = new Audio('/lion-roar.mp3');
      audio.volume = 0.6;
      audio.play().catch(e => console.log("Audio autoplay prevented by browser"));
    } catch (e) {}

    try {
      await loginWithGoogle();
      navigate('/home');
    } catch (error) {
      console.error("Error al iniciar sesión", error);
      if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
        return;
      }
      if (error?.code === 'auth/popup-blocked') {
        showToast("Tu navegador bloqueó la ventana emergente de Google. Por favor habilita los popups.", "error");
        return;
      }
      if (error?.code === 'auth/unauthorized-domain') {
        showToast("Dominio no autorizado en Firebase Auth.", "error");
        return;
      }
      showToast(`Error de inicio de sesión: ${error?.code || 'Desconocido'} - ${error?.message || 'Revisa tu conexión o permisos.'}`, "error");
    }
  };

  return (
    <div className="bg-animated" style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'flex-end', 
      alignItems: 'center', 
      background: 'url(/leones_bg_v2.jpg) no-repeat center center fixed',
      backgroundSize: 'cover',
      paddingBottom: '10vh'
    }}>
      <div className="glass-panel" style={{ 
        padding: '2.5rem', 
        maxWidth: '450px', 
        width: '100%', 
        textAlign: 'center',
        background: 'rgba(10, 15, 30, 0.75)',
        backdropFilter: 'blur(10px)',
        borderTop: '2px solid var(--crear-gold)'
      }}>
        <h1 className="text-gold uppercase" style={{ fontSize: '1.6rem', marginBottom: '0.5rem', letterSpacing: '2px' }}>CENTRO OPERATIVO</h1>
        <p className="text-muted" style={{ marginBottom: '2.5rem', fontSize: '1rem', color: '#e2e8f0' }}>Gestión por Ciclos</p>
        
        <button 
          onClick={handleLogin}
          className="btn-primary" 
          style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.8rem', background: 'linear-gradient(135deg, #8b5cf6, #29abe2)', border: 'none', color: 'white' }}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '24px', height: '24px', background: 'white', borderRadius: '50%', padding: '2px' }} />
          Continuar con Google
        </button>
        
        <p className="text-muted" style={{ marginTop: '1.5rem', fontSize: '0.75rem', opacity: 0.8 }}>Acceso exclusivo para la manada CREAR</p>
      </div>
    </div>
  );
}
