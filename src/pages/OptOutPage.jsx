import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { ShieldCheck, CheckCircle2, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';

export default function OptOutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const emailParam = searchParams.get('email') || '';
  const tokenParam = searchParams.get('token') || '';

  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [motivo, setMotivo] = useState('Ya no deseo recibir información');

  const handleConfirmOptOut = async () => {
    if (!emailParam) {
      setStatus('error');
      return;
    }

    try {
      setStatus('loading');
      const cleanEmail = emailParam.trim().toLowerCase();
      const docRef = doc(db, 'opt_outs', cleanEmail);
      
      await setDoc(docRef, {
        email: cleanEmail,
        motivo: motivo,
        tokenRecibido: tokenParam,
        fechaBaja: new Date().toISOString(),
        origen: 'web_portal_opt_out',
        updatedAt: serverTimestamp()
      }, { merge: true });

      setStatus('success');
    } catch (err) {
      console.error('Error al procesar baja:', err);
      setStatus('error');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0b0f17',
      color: '#e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        maxWidth: '520px',
        width: '100%',
        background: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '16px',
        padding: '2.5rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(217, 119, 6, 0.15)',
            color: '#f59e0b',
            marginBottom: '1rem'
          }}>
            <ShieldCheck size={28} />
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.5rem 0' }}>
            Gestión de Privacidad & Habeas Data
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
            Crear Poder Sin Límites (Crear PSL Global)
          </p>
        </div>

        {status === 'success' ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              marginBottom: '1.25rem'
            }}>
              <CheckCircle2 size={32} />
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
              Baja Procesada Exitosamente
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: '1.5', marginBottom: '1.5rem' }}>
              La dirección <strong>{emailParam}</strong> ha sido eliminada de nuestras listas de comunicación comercial y sostenimiento. No recibirás más correos sobre este programa.
            </p>
            <button
              onClick={() => navigate('/login')}
              style={{
                background: '#1f2937',
                color: '#e2e8f0',
                border: '1px solid #374151',
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cerrar esta ventana
            </button>
          </div>
        ) : status === 'error' ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <AlertCircle size={40} color="#ef4444" style={{ margin: '0 auto 1rem auto' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ef4444', marginBottom: '0.5rem' }}>
              No se pudo procesar la solicitud
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
              El enlace no contiene una dirección de correo válida o ha expirado. Por favor responde directamente al correo recibido indicando la palabra "BAJA".
            </p>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: '1.6', marginBottom: '1.25rem' }}>
              Estás a punto de desuscribirte de las comunicaciones de seguimiento de la <strong>Escuela de Liderazgo Crear PSL</strong> para el correo:
            </p>

            <div style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontWeight: 700,
              color: '#38bdf8',
              textAlign: 'center',
              marginBottom: '1.25rem'
            }}>
              {emailParam || 'Correo no especificado'}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                Motivo de tu baja (opcional):
              </label>
              <select
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0f172a',
                  border: '1px solid #374151',
                  color: '#e2e8f0',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem'
                }}
              >
                <option value="Ya no deseo recibir información">Ya no deseo recibir información</option>
                <option value="No me inscribí voluntariamente">No me inscribí voluntariamente</option>
                <option value="Horarios no compatibles">Horarios no compatibles</option>
                <option value="Ya completé el entrenamiento">Ya completé el entrenamiento</option>
                <option value="Otro motivo">Otro motivo</option>
              </select>
            </div>

            <button
              onClick={handleConfirmOptOut}
              disabled={status === 'loading' || !emailParam}
              style={{
                width: '100%',
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                padding: '0.75rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: emailParam ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                opacity: emailParam ? 1 : 0.5
              }}
            >
              {status === 'loading' ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Procesando baja...
                </>
              ) : (
                'Confirmar Baja Definitiva'
              )}
            </button>

            <p style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', marginTop: '1.25rem', lineHeight: '1.4' }}>
              En cumplimiento del derecho de Habeas Data, tu solicitud es vinculante e irreversible en nuestra plataforma.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}