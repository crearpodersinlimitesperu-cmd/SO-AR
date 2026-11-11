import React, { useState } from 'react';
import { Copy, Check, RefreshCw, ExternalLink, ShieldCheck, Terminal, Code, Database, Download } from 'lucide-react';

export const CENTRO_MANAGERS_API_BASE_URL = 'https://so-ar-copiloto.jose-sanchez-e01.workers.dev/api/centro-managers';
export const CENTRO_MANAGERS_API_KEY = 'CAUSA_NODUS_MANAGERS_API_2026_KEY_9F8A7B6C5D4E3F2A1B';

const ENDPOINTS = [
  {
    id: 'full',
    method: 'GET / POST',
    path: '/api/centro-managers',
    title: 'Snapshot Maestro Completo (Todo en 1)',
    description: 'Devuelve meta, sedesSummary, equiposSummary, entrenadoresSummary, directorio completo de managers/capitanes (con llamadas 1..16), llamadasGrupales y notasSeguimiento.'
  },
  {
    id: 'managers',
    method: 'GET / POST',
    path: '/api/centro-managers/managers',
    title: 'Directorio de Managers y Capitanes + Llamadas Individuales (1..16)',
    description: 'Lista todos los managers y capitanes con nombre, rol, teléfono, email, sede, equipo, numEquipo, entrenador normalizado, coordinador, estadoEfectivo (Activo/Graduado/Desertor) y llamadasHistorial.'
  },
  {
    id: 'equipos',
    method: 'GET / POST',
    path: '/api/centro-managers/equipos',
    title: 'Resumen de Equipos y Sedes',
    description: 'Agrupa por sede y equipo con umbrales de cohorte activa vigente, entrenador asignado, coordinador, activos, graduados, desertores y conteo de llamadas grupales.'
  },
  {
    id: 'entrenadores',
    method: 'GET / POST',
    path: '/api/centro-managers/entrenadores',
    title: 'Resumen y KPIs por Entrenador',
    description: 'Métricas por entrenador (incluyendo unificación de alias como Julio Cesar Narvaez), equipos activos vs graduados, llamadas individuales realizadas/asistidas y llamadas grupales.'
  },
  {
    id: 'llamadas',
    method: 'GET / POST',
    path: '/api/centro-managers/llamadas',
    title: 'Historial de Llamadas Grupales y Notas de Seguimiento / Quiebres',
    description: 'Todas las sesiones grupales registradas por equipo y las bitácoras/quiebres de acompañamiento.'
  }
];

export default function CentroManagersApiPanel({ onClose }) {
  const [copiedId, setCopiedId] = useState('');
  const [selectedEndpoint, setSelectedEndpoint] = useState('/api/centro-managers/equipos');
  const [filterSede, setFilterSede] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [codeTab, setCodeTab] = useState('php');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState('');

  const copyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 2200);
  };

  const buildLiveUrl = (includeKeyInQuery = false) => {
    const base = `https://so-ar-copiloto.jose-sanchez-e01.workers.dev${selectedEndpoint}`;
    const params = new URLSearchParams();
    if (filterSede) params.set('sede', filterSede);
    if (filterEstado) params.set('estado', filterEstado);
    if (includeKeyInQuery) params.set('api_key', CENTRO_MANAGERS_API_KEY);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  };

  const runLiveTest = async () => {
    setTesting(true);
    setTestError('');
    try {
      const url = buildLiveUrl(false);
      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Api-Key': CENTRO_MANAGERS_API_KEY
        }
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        throw new Error(data.message || `HTTP ${resp.status}`);
      }
      setTestResult(data);
    } catch (err) {
      setTestError(err.message || 'Error al consultar el endpoint en vivo.');
    } finally {
      setTesting(false);
    }
  };

  const curlSnippet = `curl -X GET "${buildLiveUrl(false)}" \\
  -H "X-Api-Key: ${CENTRO_MANAGERS_API_KEY}" \\
  -H "Accept: application/json"`;

  const phpSnippet = `<?php
// Sincronización Automática Causa OS (Centro de Managers) -> Nodus
$endpoint = '${buildLiveUrl(false)}';
$apiKey   = '${CENTRO_MANAGERS_API_KEY}';

$ch = curl_init($endpoint);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_HTTPHEADER     => [
        'Accept: application/json',
        'X-Api-Key: ' . $apiKey,
    ],
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200) {
    $payload = json_decode($response, true);
    // $payload['meta']['counts'] -> Totales en tiempo real
    // $payload['managers']       -> Directorio de Managers y Capitanes + llamadas 1..16
    // $payload['equiposSummary'] -> Equipos con entrenador, coordinador y estadoCohorte
    // $payload['entrenadoresSummary'] -> KPIs por entrenador
}`;

  const nodeSnippet = `// Node.js / Fetch — Sincronización Centro de Managers -> Nodus
const response = await fetch('${buildLiveUrl(false)}', {
  method: 'GET',
  headers: {
    'Accept': 'application/json',
    'X-Api-Key': '${CENTRO_MANAGERS_API_KEY}'
  }
});

const data = await response.json();
console.log('Totales Centro de Managers:', data.meta.counts);`;

  const activeSnippet = codeTab === 'php' ? phpSnippet : codeTab === 'curl' ? curlSnippet : nodeSnippet;

  return (
    <div style={{
      background: '#0f172a',
      color: '#f8fafc',
      borderRadius: '16px',
      border: '1px solid rgba(56, 189, 248, 0.3)',
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.45)',
      overflow: 'hidden',
      marginBottom: '2rem'
    }}>
      {/* Header */}
      <div style={{
        padding: '1.5rem 2rem',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span style={{
              background: 'rgba(16, 185, 129, 0.18)',
              color: '#34d399',
              border: '1px solid rgba(52, 211, 153, 0.4)',
              padding: '0.2rem 0.65rem',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.04em'
            }}>
              🟢 API LIVE · TIEMPO REAL
            </span>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>
              Puente Oficial Causa OS ⇄ Nodus (Armando Pilacuán)
            </span>
          </div>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={22} color="#38bdf8" /> API de Sincronización Automática — Centro de Managers
          </h2>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)',
              color: '#e2e8f0',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: '0.45rem 0.9rem',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.85rem'
            }}
          >
            ✕ Cerrar Panel API
          </button>
        )}
      </div>

      <div style={{ padding: '1.75rem 2rem', display: 'grid', gap: '1.5rem' }}>
        {/* Credenciales */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1rem'
        }}>
          <div style={{
            background: '#1e293b',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '12px',
            padding: '1.1rem 1.25rem'
          }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', fontWeight: 700, marginBottom: '0.4rem' }}>
              Endpoint Base de Producción
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', background: '#0f172a', padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
              <code style={{ color: '#38bdf8', fontSize: '0.82rem', wordBreak: 'break-all', fontWeight: 600 }}>
                {CENTRO_MANAGERS_API_BASE_URL}
              </code>
              <button
                type="button"
                onClick={() => copyText(CENTRO_MANAGERS_API_BASE_URL, 'base_url')}
                style={{
                  background: copiedId === 'base_url' ? '#059669' : '#0284c7',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.4rem 0.7rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  flexShrink: 0
                }}
              >
                {copiedId === 'base_url' ? <Check size={14} /> : <Copy size={14} />}
                {copiedId === 'base_url' ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>

          <div style={{
            background: '#1e293b',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '12px',
            padding: '1.1rem 1.25rem'
          }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', fontWeight: 700, marginBottom: '0.4rem' }}>
              API Key Oficial (Header <code style={{ color: '#fbbf24' }}>X-Api-Key</code> o Query <code style={{ color: '#fbbf24' }}>?api_key=</code>)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', background: '#0f172a', padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
              <code style={{ color: '#fbbf24', fontSize: '0.82rem', wordBreak: 'break-all', fontWeight: 700 }}>
                {CENTRO_MANAGERS_API_KEY}
              </code>
              <button
                type="button"
                onClick={() => copyText(CENTRO_MANAGERS_API_KEY, 'api_key')}
                style={{
                  background: copiedId === 'api_key' ? '#059669' : '#d97706',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.4rem 0.7rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  flexShrink: 0
                }}
              >
                {copiedId === 'api_key' ? <Check size={14} /> : <Copy size={14} />}
                {copiedId === 'api_key' ? 'Copiada' : 'Copiar Key'}
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Endpoints */}
        <div>
          <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ShieldCheck size={18} color="#34d399" /> Endpoints Disponibles y Filtros Soportados
          </h3>
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {ENDPOINTS.map((ep) => {
              const fullUrlWithKey = `https://so-ar-copiloto.jose-sanchez-e01.workers.dev${ep.path}?api_key=${CENTRO_MANAGERS_API_KEY}`;
              return (
                <div
                  key={ep.id}
                  style={{
                    background: selectedEndpoint === ep.path ? 'rgba(56, 189, 248, 0.12)' : '#1e293b',
                    border: selectedEndpoint === ep.path ? '1px solid #38bdf8' : '1px solid rgba(148, 163, 184, 0.16)',
                    borderRadius: '10px',
                    padding: '0.85rem 1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ flex: 1, minWidth: '260px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                      <span style={{ background: '#0284c7', color: '#fff', fontSize: '0.68rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                        {ep.method}
                      </span>
                      <code style={{ color: '#38bdf8', fontWeight: 700, fontSize: '0.88rem' }}>{ep.path}</code>
                      <span style={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.86rem' }}>— {ep.title}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>{ep.description}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedEndpoint(ep.path)}
                      style={{
                        background: 'rgba(56, 189, 248, 0.15)',
                        color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                        borderRadius: '6px',
                        padding: '0.35rem 0.65rem',
                        cursor: 'pointer',
                        fontSize: '0.76rem',
                        fontWeight: 700
                      }}
                    >
                      Seleccionar
                    </button>
                    <a
                      href={fullUrlWithKey}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#34d399',
                        border: '1px solid rgba(52, 211, 153, 0.35)',
                        borderRadius: '6px',
                        padding: '0.35rem 0.65rem',
                        textDecoration: 'none',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      Abrir JSON <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: '0.6rem', fontSize: '0.78rem', color: '#94a3b8' }}>
            💡 <strong>Parámetros de filtro opcionales:</strong>{' '}
            <code>?sede=Lima</code> (Lima, Guayaquil, Quito, Cuenca, Medellín, México) ·{' '}
            <code>&amp;estado=Activo</code> (Activo, Graduado, Desertor) ·{' '}
            <code>&amp;equipo=32</code> ·{' '}
            <code>&amp;entrenador=Julio%20Cesar%20Narvaez</code>
          </div>
        </div>

        {/* Probador en Vivo + Snippets */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.25rem'
        }}>
          {/* Probador en Vivo */}
          <div style={{
            background: '#1e293b',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '12px',
            padding: '1.15rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Terminal size={16} color="#38bdf8" /> Probador de API en Tiempo Real
              </h4>
              <button
                type="button"
                onClick={runLiveTest}
                disabled={testing}
                style={{
                  background: '#10b981',
                  color: '#052e16',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.45rem 0.9rem',
                  cursor: testing ? 'wait' : 'pointer',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <RefreshCw size={14} /> {testing ? 'Consultando Firestore...' : '⚡ Ejecutar Consulta en Vivo'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
              <select
                value={selectedEndpoint}
                onChange={(e) => setSelectedEndpoint(e.target.value)}
                style={{ background: '#0f172a', color: '#f8fafc', border: '1px solid #334155', borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.8rem', flex: 1 }}
              >
                {ENDPOINTS.map((ep) => (
                  <option key={ep.id} value={ep.path}>{ep.path}</option>
                ))}
              </select>
              <select
                value={filterSede}
                onChange={(e) => setFilterSede(e.target.value)}
                style={{ background: '#0f172a', color: '#f8fafc', border: '1px solid #334155', borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
              >
                <option value="">Todas las Sedes</option>
                <option value="Lima">Lima</option>
                <option value="Guayaquil">Guayaquil</option>
                <option value="Quito">Quito</option>
                <option value="Cuenca">Cuenca</option>
                <option value="Medellín">Medellín</option>
                <option value="México">México</option>
              </select>
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                style={{ background: '#0f172a', color: '#f8fafc', border: '1px solid #334155', borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
              >
                <option value="">Todos los Estados</option>
                <option value="Activo">Solo Activos</option>
                <option value="Graduado">Solo Graduados</option>
                <option value="Desertor">Solo Desertores</option>
              </select>
            </div>

            {testError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.65rem', borderRadius: '8px', fontSize: '0.8rem' }}>
                {testError}
              </div>
            )}

            {testResult && (
              <div>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.6rem', fontSize: '0.76rem' }}>
                  <span style={{ background: '#0f172a', padding: '0.25rem 0.55rem', borderRadius: '6px', color: '#38bdf8', fontWeight: 700 }}>
                    Total Managers: {testResult.meta?.counts?.totalManagers ?? 0}
                  </span>
                  <span style={{ background: '#0f172a', padding: '0.25rem 0.55rem', borderRadius: '6px', color: '#34d399', fontWeight: 700 }}>
                    Activos: {testResult.meta?.counts?.activos ?? 0}
                  </span>
                  <span style={{ background: '#0f172a', padding: '0.25rem 0.55rem', borderRadius: '6px', color: '#fbbf24', fontWeight: 700 }}>
                    Graduados: {testResult.meta?.counts?.graduados ?? 0}
                  </span>
                  <span style={{ background: '#0f172a', padding: '0.25rem 0.55rem', borderRadius: '6px', color: '#c084fc', fontWeight: 700 }}>
                    Equipos: {testResult.meta?.counts?.totalEquipos ?? 0}
                  </span>
                </div>
                <pre style={{
                  background: '#0f172a',
                  color: '#a7f3d0',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.74rem',
                  maxHeight: '220px',
                  overflow: 'auto',
                  margin: 0,
                  border: '1px solid #334155'
                }}>
                  {JSON.stringify(testResult, null, 2).slice(0, 4000)}
                </pre>
              </div>
            )}
          </div>

          {/* Snippets de Integración para Nodus */}
          <div style={{
            background: '#1e293b',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '12px',
            padding: '1.15rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Code size={16} color="#fbbf24" /> Código de Integración para Nodus
              </h4>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {[
                  { id: 'php', label: 'PHP / Laravel (Nodus)' },
                  { id: 'curl', label: 'cURL' },
                  { id: 'node', label: 'Node.js / JS' }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setCodeTab(t.id)}
                    style={{
                      background: codeTab === t.id ? '#0284c7' : '#0f172a',
                      color: '#fff',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      padding: '0.3rem 0.6rem',
                      cursor: 'pointer',
                      fontSize: '0.74rem',
                      fontWeight: 700
                    }}
                  >
                    {t.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => copyText(activeSnippet, 'snippet')}
                  style={{
                    background: copiedId === 'snippet' ? '#059669' : '#334155',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.3rem 0.65rem',
                    cursor: 'pointer',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  {copiedId === 'snippet' ? <Check size={12} /> : <Copy size={12} />}
                  {copiedId === 'snippet' ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
            <pre style={{
              background: '#0f172a',
              color: '#e2e8f0',
              padding: '0.85rem',
              borderRadius: '8px',
              fontSize: '0.75rem',
              maxHeight: '250px',
              overflow: 'auto',
              margin: 0,
              border: '1px solid #334155',
              lineHeight: 1.45
            }}>
              {activeSnippet}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
