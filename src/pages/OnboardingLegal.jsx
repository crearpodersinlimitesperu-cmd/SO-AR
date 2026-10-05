import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LegalOnboardingModal from '../components/LegalOnboardingModal';
import { getLegalStatusByParticipant } from '../services/legalSignatureService';

export default function OnboardingLegal() {
  const { currentUser, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [needsSignature, setNeedsSignature] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      if (!currentUser?.email) {
        if (isMounted) {
          setChecking(false);
          setNeedsSignature(true);
        }
        return;
      }
      try {
        const sig = await getLegalStatusByParticipant(currentUser.email);
        if (isMounted) {
          if (!sig || !sig.terms_accepted || !sig.nda_signed || !sig.privacy_accepted) {
            setNeedsSignature(true);
          } else {
            // Ya firmó y está logueado, lo mandamos al home
            navigate('/home');
          }
          setChecking(false);
        }
      } catch (err) {
        console.error('Error in OnboardingLegal:', err);
        if (isMounted) {
          setChecking(false);
          setNeedsSignature(true);
        }
      }
    };
    checkStatus();
    return () => { isMounted = false; };
  }, [currentUser, navigate]);

  if (checking) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0b162c', color: 'var(--crear-gold)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>CREAR PODER SIN LÍMITES</div>
          <div style={{ marginTop: '1rem', fontSize: '0.9rem' }}>Preparando entorno seguro...</div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0a0f1d', color: '#ffffff', padding: '1rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ maxWidth: '440px', width: '100%', background: '#111827', border: '1px solid rgba(255, 183, 3, 0.3)', borderRadius: '16px', padding: '2.5rem', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔐</div>
          <h2 style={{ color: '#ffb703', margin: '0 0 0.5rem 0', fontSize: '1.4rem', fontWeight: 800 }}>
            Blindaje y Firma Legal
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 1.5rem 0' }}>
            Para firmar oficialmente tus acuerdos y vincular tu identidad digital en CREAR PSL, por favor continúa con tu cuenta de Google.
          </p>
          <button
            onClick={loginWithGoogle}
            style={{
              width: '100%',
              padding: '0.9rem 1.2rem',
              background: '#ffffff',
              color: '#1e293b',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
            onMouseOut={e => e.currentTarget.style.background = '#ffffff'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Continuar con Google
          </button>
        </div>
      </div>
    );
  }

  if (needsSignature) {
    return (
      <div style={{ height: '100vh', width: '100vw', background: '#0A192F', position: 'relative' }}>
        <LegalOnboardingModal
          currentUser={currentUser}
          sede={currentUser?.sede || 'ALL'}
          onComplete={() => {
            navigate('/home');
          }}
        />
      </div>
    );
  }

  return null;
}
