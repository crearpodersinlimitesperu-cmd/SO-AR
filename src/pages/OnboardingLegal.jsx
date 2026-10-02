import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LegalOnboardingModal from '../components/LegalOnboardingModal';
import { getLegalStatusByParticipant } from '../services/legalSignatureService';

export default function OnboardingLegal() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [needsSignature, setNeedsSignature] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      if (!currentUser?.email) {
        if (isMounted) {
          setChecking(false);
          // If not logged in, maybe redirect to login? The route will be protected anyway.
        }
        return;
      }
      try {
        const sig = await getLegalStatusByParticipant(currentUser.email);
        if (isMounted) {
          if (!sig || !sig.terms_accepted || !sig.nda_signed || !sig.privacy_accepted) {
            setNeedsSignature(true);
          } else {
            // Already signed, redirect to home
            navigate('/home');
          }
          setChecking(false);
        }
      } catch (err) {
        console.error('Error in OnboardingLegal:', err);
        if (isMounted) {
          setChecking(false);
          setNeedsSignature(true); // Fallback to show it just in case
        }
      }
    };
    checkStatus();
    return () => { isMounted = false; };
  }, [currentUser, navigate]);

  if (checking) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#64748b' }}>
        Verificando estado legal...
      </div>
    );
  }

  if (needsSignature) {
    return (
      <div style={{ height: '100vh', width: '100vw', background: '#e2e8f0', position: 'relative' }}>
        <LegalOnboardingModal
          currentUser={currentUser}
          sede={currentUser?.sede}
          onComplete={() => navigate('/home')}
        />
      </div>
    );
  }

  return null;
}
