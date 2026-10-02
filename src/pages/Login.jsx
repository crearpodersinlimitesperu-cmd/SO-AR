import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { Loader2, Shield } from 'lucide-react';

export default function Login() {
  const { currentUser, loginWithGoogle } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  // Obtener el origen desde la URL o el state
  const searchParams = new URLSearchParams(location.search);
  const from = searchParams.get('from') || '/home';
  const isParticipantLogin = from.includes('onboarding-legal');

  useEffect(() => {
    if (currentUser) {
      navigate(from);
    }
  }, [currentUser, navigate, from]);

  const handleLogin = async () => {
    if (isLoading) return;
    setIsLoading(true);
    
    // Play lion roar only for internal staff
    if (!isParticipantLogin) {
      try {
        const audio = new Audio('/lion-roar.mp3');
        audio.volume = 0.6;
        audio.play().catch(e => console.log("Audio autoplay prevented"));
      } catch (e) {}
    }

    try {
      await loginWithGoogle();
      navigate(from);
    } catch (error) {
      console.error("Error al iniciar sesión", error);
      setIsLoading(false);
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
      const errorMsg = error?.message || error?.code || 'Desconocido';
      showToast(`Error de inicio de sesión: ${errorMsg}`, "error");
    }
  };

  // --- UI PARA PARTICIPANTES (AMIGABLE, PREMIUM, SIN LEONES) ---
  if (isParticipantLogin) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center', 
        background: 'linear-gradient(135deg, #0A192F 0%, #112240 100%)',
        padding: '2rem',
        fontFamily: 'var(--font-body)'
      }}>
        <div style={{ 
          padding: '3rem 2.5rem', 
          maxWidth: '480px', 
          width: '100%', 
          textAlign: 'center',
          background: 'var(--bg-dark-alt)',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          border: '1px solid var(--border-strong)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'linear-gradient(90deg, var(--crear-gold), #FFD54F)' }} />
          
          <div style={{ background: 'var(--crear-gold-light)', display: 'inline-flex', padding: '1rem', borderRadius: '50%', marginBottom: '1.5rem', border: '1px solid rgba(255,193,7,0.3)' }}>
            <Shield size={36} color="var(--crear-gold)" />
          </div>
          
          <div style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.2em', color: 'var(--crear-gold)', textTransform: 'uppercase', marginBottom: '8px' }}>
            CREAR PODER SIN LÍMITES
          </div>
          <h1 style={{ color: 'var(--text-heading)', margin: '0 0 0.5rem', fontSize: '1.6rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            Plataforma Oficial de Firmas y Accesos
          </h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Para iniciar el proceso de revisión y firma digital de tus documentos legales (Aliados, Participantes y Equipo), por favor ingresa con tu cuenta de correo asociada.
          </p>
          
          <button 
            onClick={handleLogin}
            disabled={isLoading}
            style={{ 
              width: '100%', padding: '1.1rem', fontSize: '1.05rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.8rem', 
              background: 'white', border: 'none', borderRadius: '12px', color: '#1f2937', fontWeight: 700,
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)', cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
              opacity: isLoading ? 0.7 : 1
            }}
            onMouseOver={e => !isLoading && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseOut={e => !isLoading && (e.currentTarget.style.transform = 'translateY(0)')}
          >
            {isLoading ? (
              <Loader2 className="spin" size={24} />
            ) : (
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '24px', height: '24px' }} />
            )}
            {isLoading ? 'Autenticando...' : 'Ingresar con Google'}
          </button>
          
          <p style={{ marginTop: '2rem', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Shield size={14} /> Acceso Seguro
          </p>
        </div>
      </div>
    );
  }

  // --- UI ORIGINAL INTERNA (LEONES, MANADA CREAR) ---
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
          disabled={isLoading}
          className="btn-primary" 
          style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.8rem', background: 'linear-gradient(135deg, #8b5cf6, #29abe2)', border: 'none', color: 'white', opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
        >
          {isLoading ? (
            <Loader2 className="spin" size={24} />
          ) : (
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '24px', height: '24px', background: 'white', borderRadius: '50%', padding: '2px' }} />
          )}
          {isLoading ? 'Iniciando...' : 'Continuar con Google'}
        </button>
        
        <p className="text-muted" style={{ marginTop: '1.5rem', fontSize: '0.75rem', opacity: 0.8 }}>Acceso exclusivo para la manada CREAR</p>
      </div>
    </div>
  );
}
