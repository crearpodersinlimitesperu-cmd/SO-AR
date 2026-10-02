const fs = require('fs');
const file = 'src/pages/OnboardingLegal.jsx';
let content = fs.readFileSync(file, 'utf8');

const newContent = `import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LegalOnboardingModal from '../components/LegalOnboardingModal';
import { getLegalStatusByParticipant } from '../services/legalSignatureService';

export default function OnboardingLegal() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [needsSignature, setNeedsSignature] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      // Si NO está logueado, asumimos que NECESITA firma (es externo)
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

  if (needsSignature) {
    return (
      <div style={{ height: '100vh', width: '100vw', background: '#0A192F', position: 'relative' }}>
        <LegalOnboardingModal
          currentUser={currentUser}
          sede={currentUser?.sede || 'ALL'}
          onComplete={() => {
            if (currentUser) {
              navigate('/home');
            } else {
              // Si es externo, no lo mandamos a /home porque no tiene sesión
              window.location.href = 'https://crearpsl.net';
            }
          }}
        />
      </div>
    );
  }

  return null;
}
`;

fs.writeFileSync(file, newContent);
console.log('OnboardingLegal allows public access');
