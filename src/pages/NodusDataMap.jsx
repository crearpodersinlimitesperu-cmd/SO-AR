import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Loader2, AlertTriangle, RefreshCw, Map, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../services/firebase';

// NOTA (28/08/2026): Herramienta independiente de mapeo C1/C2/Maestría a
// partir de los datos de Nodus ya sincronizados (nodus_kpis_sincronizados,
// vía scripts/nodusScraper.js). Reutiliza el mismo backend cerrado
// (Cloudflare Worker) que el Copiloto SO-AR, en un endpoint nuevo
// (/nodus-data-map) — decidido así con José en vez de un Worker aparte, para
// no duplicar la autenticación ni la conexión a Groq que ya funcionan en
// producción. Ver cloudflare-worker/src/index.js -> handleNodusDataMap()
// para la nota completa sobre qué tan fiel es esto al prompt original
// (trabaja sobre el snapshot diario, no navega Nodus en vivo).
//
// Acceso: solo gerencia/dirección (mismo criterio que el Copiloto SO-AR),
// verificado también en el servidor — este chequeo de rol en el cliente es
// solo para no mostrar un botón que el servidor rechazaría.

const ROLES_CON_ACCESO = ['gerente', 'direccion', 'cfo', 'cco', 'ceo', 'director_maestria', 'superadmin', 'consolidado'];

// Copia local y reducida del renderer de markdown que ya usa AICopilot.jsx
// (no se importó de ahí para no acoplar esta página nueva a ese componente).
// Soporta lo mismo que genera el modelo: párrafos, **negrita**, listas "-"/"*".
function renderInlineMarkdown(text, keyPrefix) {
  const partes = (text || '').split(/(\*\*[^*]+\*\*)/g);
  return partes.map((parte, i) => {
    if (parte.startsWith('**') && parte.endsWith('**') && parte.length > 4) {
      return <strong key={`${keyPrefix}-b-${i}`}>{parte.slice(2, -2)}</strong>;
    }
    return parte ? <React.Fragment key={`${keyPrefix}-t-${i}`}>{parte}</React.Fragment> : null;
  });
}

function renderMarkdown(texto) {
  if (!texto) return null;
  const lineas = texto.split('\n');
  const bloques = [];
  let listaActual = null;
  let parrafoActual = [];

  const cerrarParrafo = () => {
    if (parrafoActual.length) {
      bloques.push({ tipo: 'p', texto: parrafoActual.join(' ') });
      parrafoActual = [];
    }
  };
  const cerrarLista = () => {
    if (listaActual) {
      bloques.push(listaActual);
      listaActual = null;
    }
  };

  for (const linea of lineas) {
    const trimmed = linea.trim();
    if (!trimmed) {
      cerrarParrafo();
      cerrarLista();
      continue;
    }
    const bullet = /^[-*]\s+(.*)/.exec(trimmed);
    if (bullet) {
      cerrarParrafo();
      if (!listaActual || listaActual.tipo !== 'ul') {
        cerrarLista();
        listaActual = { tipo: 'ul', items: [] };
      }
      listaActual.items.push(bullet[1]);
      continue;
    }
    cerrarLista();
    parrafoActual.push(trimmed);
  }
  cerrarParrafo();
  cerrarLista();

  return bloques.map((b, i) => {
    if (b.tipo === 'ul') {
      return (
        <ul key={`b-${i}`} style={{ margin: '0.4rem 0', paddingLeft: '1.3rem' }}>
          {b.items.map((it, j) => <li key={j} style={{ marginBottom: '0.2rem' }}>{renderInlineMarkdown(it, `li-${i}-${j}`)}</li>)}
        </ul>
      );
    }
    return <p key={`b-${i}`} style={{ margin: '0.5rem 0', lineHeight: 1.6 }}>{renderInlineMarkdown(b.texto, `p-${i}`)}</p>;
  });
}

export default function NodusDataMap() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const tieneAcceso = currentUser?.isSuperAdmin || currentUser?.isDireccion || currentUser?.isGerente || ROLES_CON_ACCESO.includes(currentUser?.appRole);

  const generarMapa = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const workerUrl = import.meta.env.VITE_COPILOTO_WORKER_URL || 'https://so-ar-copiloto.crearpsl-cpsl.workers.dev';
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        throw new Error('No se detectó sesión activa. Cierra sesión e inicia nuevamente.');
      }
      const idToken = await firebaseUser.getIdToken(true);
      const res = await fetch(`${workerUrl}/nodus-data-map`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'No se pudo generar el mapa.');
      }
      setResult(data);
    } catch (e) {
      setError(e.message || 'Error desconocido al generar el mapa.');
    } finally {
      setLoading(false);
    }
  };

  if (!tieneAcceso) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '2rem', textAlign: 'center' }} className="glass-panel">
        <AlertTriangle size={32} style={{ color: 'var(--color-warning)', marginBottom: '1rem' }} />
        <h2 className="text-heading">Acceso restringido</h2>
        <p className="text-muted">Nodus Data Map está disponible solo para gerencia y dirección.</p>
        <button onClick={() => navigate('/home')} className="btn-primary" style={{ marginTop: '1rem' }}>Volver a Inicio</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.2rem' }}>
      <button
        onClick={() => navigate('/home')}
        className="btn-secondary"
        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.2rem', padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
      >
        <ArrowLeft size={15} /> Volver a Inicio
      </button>

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
          <Map size={22} style={{ color: 'var(--crear-gold)' }} />
          <h1 style={{ margin: 0, fontSize: '1.4rem' }}>Nodus Data Map</h1>
        </div>
        <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.5 }}>
          Mapa de C1, C2 y Maestría del Juego construido solo con datos verificables del último snapshot sincronizado de Nodus.
          No inventa personas, equipos, fechas ni métricas — un campo vacío se reporta como "sin dato registrado", nunca como cero.
        </p>

        <button
          onClick={generarMapa}
          disabled={loading}
          className="btn-primary"
          style={{ marginTop: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: loading ? 0.7 : 1, cursor: loading ? 'wait' : 'pointer' }}
        >
          {loading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
          {loading ? 'Generando mapa (puede tardar hasta 1 minuto)…' : (result ? 'Regenerar mapa' : 'Generar mapa')}
        </button>
      </div>

      {error && (
        <div className="glass-panel" style={{ padding: '1rem 1.2rem', marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.08)', display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
          <AlertTriangle size={18} style={{ color: 'var(--color-error)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ color: 'var(--color-error)' }}>No se pudo generar el mapa</strong>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{error}</p>
          </div>
        </div>
      )}

      {result && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <Clock size={13} />
            Snapshot de Nodus del {result.dataTimestamp} · Generado el {new Date(result.generatedAt).toLocaleString('es')}
            {result.huboErrores && (
              <span style={{ color: 'var(--color-warning)', fontWeight: 600, marginLeft: '0.4rem' }}>
                — algunos bloques fallaron, puedes reintentar
              </span>
            )}
          </div>

          {result.secciones.map((s) => (
            <div key={s.id} className="glass-panel" style={{ padding: '1.3rem 1.5rem', marginBottom: '1.2rem' }}>
              <h3 style={{ margin: '0 0 0.6rem', fontSize: '1.05rem', color: 'var(--crear-gold)' }}>{s.titulo}</h3>
              <div style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>
                {renderMarkdown(s.contenido)}
              </div>
            </div>
          ))}

          <div className="glass-panel" style={{ padding: '1rem 1.3rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
            {result.fraseCierre}
          </div>
        </>
      )}
    </div>
  );
}
