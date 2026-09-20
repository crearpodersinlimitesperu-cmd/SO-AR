// ============================================================================
// ASIGNADOR OFICIAL DE ENTRENADORES & CRONOGRAMA MAESTRO
// ----------------------------------------------------------------------------
// Reconstruido el 20/09/2026 a pedido de José. El original nunca llegó a
// commitearse (se buscó en todo el historial de git de todas las ramas, en el
// disco, en dist/, en el zip de respaldo y en Descargas: no existe), así que
// esto NO es una restauración de código perdido — es una reconstrucción sobre
// la especificación de la captura que él envió, conectada a los datos REALES
// que ya tiene la plataforma.
//
// DE DÓNDE SALE CADA DATO (regla del proyecto: no inventar nada):
//  • Entrenamientos/fechas/sedes  -> events de CyclesContext, que ya se traen
//    del Apps Script oficial (?action=getEventos). Es la misma hoja de Google
//    que hoy se edita a mano: por eso el encabezado dice "sincronizado con
//    Google Sheets".
//  • Entrenadores disponibles     -> getAllCompanyUsers() filtrando por rol
//    entrenador / entrenador_llamadas. Son personas reales del directorio.
//  • Asignaciones                 -> colección Firestore "asignaciones_entrenadores".
//    ESTA es la parte que reemplaza al Sheet: lo que se elige acá queda en
//    Causa OS y pisa (visualmente) lo que traiga la hoja.
//  • Trazabilidad                 -> colección "audit_logs", el mismo registro
//    que ya usa el resto de la plataforma.
//  • Vuelos                       -> /vuelos_tracker.json (misma fuente que
//    MonitorVuelosCartas.jsx). Si no está, se dice "sin datos", no se inventa.
//  • Pólizas Drive                -> NO hay integración de lectura de Drive en
//    la plataforma todavía. En vez de mostrar un número inventado, la pestaña
//    lo declara explícitamente como pendiente de conectar.
//
// MAESTRÍA DEL JUEGO: un ciclo de MJ son 3 fines de semana distintos
// (Creación, Relación y Gratitud) y cada uno puede llevar un entrenador
// diferente. Por eso, cuando el entrenamiento es de MJ, la fila se expande en
// 3 asignaciones independientes en vez de una sola.
//
// ACCESO: solo Fer, Paul y José (canUseAsignadorEntrenadores).
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Calendar, CheckCircle2, AlertTriangle, Plane, Building2,
  ShieldCheck, Search, History, ExternalLink, Users, Save, X, Filter
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { useCycles } from '../context/CyclesContext';
import { useUI } from '../context/UIContext';
import { getAllCompanyUsers } from '../services/userService';
import { normalizeSede, normalizeRole, OPERATIONAL_SEDES } from '../data/usersData';
import { getFlagForSede } from '../utils/flags';
import { canUseAsignadorEntrenadores } from '../config/permissions';

// Los 3 fines de semana de Maestría del Juego. El orden es el oficial del
// entrenamiento y se usa tal cual para numerar los FDS.
const FDS_MAESTRIA = ['Creación', 'Relación', 'Gratitud'];

const esMaestria = (nombre) => {
  const n = (nombre || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return n.includes('maestria') || n.includes('mj') || n.includes('el viaje');
};

// Identificador estable de un entrenamiento. Los eventos del Apps Script no
// traen un id propio, así que se arma con los campos que sí identifican de
// forma única a un entrenamiento: fecha de inicio + sede + nombre. Si la hoja
// cambia una de esas tres cosas, se considera otro entrenamiento (y así debe
// ser: es un evento distinto).
const eventoKey = (ev) => {
  const f = (ev.fecha_inicio || ev.start || '').toString().slice(0, 10);
  const s = normalizeSede(ev.sede || ev.sedeTag || '');
  const n = (ev.nombre || ev.name || '').toString().trim();
  return `${f}__${s}__${n}`.replace(/\//g, '-');
};

const fmtFecha = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v).slice(0, 10);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function AsignadorEntrenadores() {
  const { currentUser } = useAuth();
  const { events, loadingEvents } = useCycles();
  const { showToast } = useUI();
  const navigate = useNavigate();

  const [asignaciones, setAsignaciones] = useState({});   // key -> { [fds]: {entrenador, ...} }
  const [entrenadores, setEntrenadores] = useState([]);
  const [vuelos, setVuelos] = useState(null);             // null = aún no se sabe
  const [vuelosError, setVuelosError] = useState(false);
  const [trazas, setTrazas] = useState([]);
  const [tab, setTab] = useState('matriz');
  const [guardando, setGuardando] = useState('');

  // Filtros
  const [periodo, setPeriodo] = useState('proximos');
  const [filtroSede, setFiltroSede] = useState('todas');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroEntrenador, setFiltroEntrenador] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  const autorizado = canUseAsignadorEntrenadores(currentUser);

  // --- Entrenadores reales del directorio ----------------------------------
  useEffect(() => {
    if (!autorizado) return;
    let vivo = true;
    (async () => {
      try {
        const todos = await getAllCompanyUsers();
        const soloEntrenadores = todos.filter(u => {
          const roles = [u.role, u.appRole, ...(Array.isArray(u.roles) ? u.roles : [])]
            .filter(Boolean).map(r => normalizeRole(r));
          const activo = u.isActive !== false && u.status !== 'inactive';
          return activo && roles.some(r => r === 'entrenador' || r === 'entrenador_llamadas');
        });
        const vistos = new Set();
        const unicos = [];
        soloEntrenadores.forEach(u => {
          const nombre = (u.name || u.displayName || '').trim();
          if (!nombre || vistos.has(nombre.toLowerCase())) return;
          vistos.add(nombre.toLowerCase());
          unicos.push({ nombre, email: u.email || u.corporateEmail || '', sede: u.sede || '' });
        });
        if (vivo) setEntrenadores(unicos.sort((a, b) => a.nombre.localeCompare(b.nombre)));
      } catch (e) {
        console.error('No se pudo cargar el directorio de entrenadores:', e);
        if (vivo) showToast('No se pudo cargar la lista de entrenadores.', 'error');
      }
    })();
    return () => { vivo = false; };
  }, [autorizado]);

  // --- Asignaciones guardadas en Causa OS (en vivo) -------------------------
  useEffect(() => {
    if (!autorizado) return;
    const unsub = onSnapshot(collection(db, 'asignaciones_entrenadores'), snap => {
      const out = {};
      snap.forEach(d => { out[d.id] = d.data(); });
      setAsignaciones(out);
    }, err => {
      console.error('asignaciones_entrenadores:', err);
      showToast('No se pudieron leer las asignaciones guardadas: ' + err.message, 'error');
    });
    return () => unsub();
  }, [autorizado]);

  // --- Trazabilidad de esta pantalla ---------------------------------------
  useEffect(() => {
    if (!autorizado) return;
    const unsub = onSnapshot(collection(db, 'asignaciones_entrenadores_log'), snap => {
      const out = [];
      snap.forEach(d => out.push({ id: d.id, ...d.data() }));
      out.sort((a, b) => new Date(b.fechaIso || 0) - new Date(a.fechaIso || 0));
      setTrazas(out);
    }, () => { /* si no hay permiso de lectura, simplemente no se muestra historial */ });
    return () => unsub();
  }, [autorizado]);

  // --- Vuelos (misma fuente que el Monitor de Vuelos) ----------------------
  useEffect(() => {
    if (!autorizado) return;
    (async () => {
      try {
        let res = await fetch('/vuelos_tracker.json?t=' + Date.now());
        if (!res.ok) res = await fetch('/cartas/vuelos_tracker.json?t=' + Date.now());
        if (!res.ok) { setVuelosError(true); return; }
        const data = await res.json();
        setVuelos(Array.isArray(data) ? data : (data.vuelos || []));
      } catch {
        setVuelosError(true);
      }
    })();
  }, [autorizado]);

  // --- Filas: un entrenamiento = 1 fila, salvo MJ = 3 filas (un FDS c/u) ----
  const filas = useMemo(() => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const out = [];
    (events || []).forEach(ev => {
      const inicio = ev.fecha_inicio || ev.start;
      if (!inicio) return;
      const d = new Date(inicio);
      if (periodo === 'proximos' && !isNaN(d.getTime()) && d < hoy) return;
      if (periodo === 'pasados' && !isNaN(d.getTime()) && d >= hoy) return;

      const key = eventoKey(ev);
      const nombre = ev.nombre || ev.name || 'Entrenamiento';
      const sede = normalizeSede(ev.sede || ev.sedeTag || '');
      const guardado = asignaciones[key] || {};
      const slots = esMaestria(nombre) ? FDS_MAESTRIA : ['unico'];

      slots.forEach((slot, i) => {
        const asign = guardado[slot] || {};
        out.push({
          key, slot,
          esMJ: slots.length > 1,
          fdsLabel: slots.length > 1 ? `FDS ${i + 1} · ${slot}` : null,
          nombre, sede,
          fechaInicio: inicio,
          fechaFin: ev.fecha_fin || ev.end || '',
          equipo: ev.equipo || ev.team || '',
          lugar: ev.lugar || ev.direccion || '',
          // entrenador de la hoja (lo que hay hoy) vs el asignado en Causa OS
          entrenadorHoja: ev.trainer || ev.entrenador || '',
          entrenadorAsignado: asign.entrenador || '',
          asignadoPor: asign.asignadoPor || '',
          asignadoEn: asign.fechaIso || '',
        });
      });
    });
    out.sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio));
    return out;
  }, [events, asignaciones, periodo]);

  const filasFiltradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return filas.filter(f => {
      if (filtroSede !== 'todas' && f.sede !== filtroSede) return false;
      if (filtroTipo === 'mj' && !f.esMJ) return false;
      if (filtroTipo === 'c1c2' && f.esMJ) return false;
      if (filtroEntrenador === 'pendientes' && (f.entrenadorAsignado || f.entrenadorHoja)) return false;
      if (filtroEntrenador !== 'todos' && filtroEntrenador !== 'pendientes') {
        const actual = f.entrenadorAsignado || f.entrenadorHoja;
        if (actual !== filtroEntrenador) return false;
      }
      if (q) {
        const blob = `${f.nombre} ${f.sede} ${f.equipo} ${f.lugar} ${f.entrenadorAsignado} ${f.entrenadorHoja}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [filas, filtroSede, filtroTipo, filtroEntrenador, busqueda]);

  // --- KPIs (todos calculados sobre las filas reales) ----------------------
  const kpis = useMemo(() => {
    const total = filas.length;
    const conEntrenador = filas.filter(f => f.entrenadorAsignado || f.entrenadorHoja).length;
    const sedes = new Set(filas.map(f => f.sede).filter(Boolean));
    return {
      total,
      conEntrenador,
      pct: total > 0 ? Math.round((conEntrenador / total) * 100) : 0,
      pendientes: total - conEntrenador,
      sedes: sedes.size,
    };
  }, [filas]);

  // --- Carga por entrenador (CÁLCULO explícito sobre las filas) ------------
  const carga = useMemo(() => {
    const m = new Map();
    entrenadores.forEach(e => m.set(e.nombre, { nombre: e.nombre, sede: e.sede, total: 0, mj: 0, c1c2: 0, proximos: [] }));
    filas.forEach(f => {
      const n = f.entrenadorAsignado || f.entrenadorHoja;
      if (!n) return;
      if (!m.has(n)) m.set(n, { nombre: n, sede: '', total: 0, mj: 0, c1c2: 0, proximos: [] });
      const it = m.get(n);
      it.total++;
      if (f.esMJ) it.mj++; else it.c1c2++;
      it.proximos.push(f);
    });
    return [...m.values()].sort((a, b) => b.total - a.total);
  }, [entrenadores, filas]);

  // --- Guardar una asignación (con trazabilidad) ---------------------------
  const asignar = async (fila, nuevoEntrenador) => {
    if (!autorizado) return;
    const anterior = fila.entrenadorAsignado || fila.entrenadorHoja || '(sin asignar)';
    if (nuevoEntrenador === fila.entrenadorAsignado) return;
    setGuardando(`${fila.key}__${fila.slot}`);
    try {
      const ref = doc(db, 'asignaciones_entrenadores', fila.key);
      const payload = {
        entrenamiento: fila.nombre,
        sede: fila.sede,
        fechaInicio: fila.fechaInicio,
        fechaFin: fila.fechaFin || null,
        equipo: fila.equipo || null,
        actualizadoEn: serverTimestamp(),
        [fila.slot]: nuevoEntrenador
          ? {
              entrenador: nuevoEntrenador,
              asignadoPor: currentUser?.name || currentUser?.email || 'desconocido',
              asignadoPorEmail: currentUser?.email || '',
              fechaIso: new Date().toISOString(),
            }
          : null,
      };
      await setDoc(ref, payload, { merge: true });

      // Trazabilidad: queda el quién, qué, cuándo y el valor anterior.
      await addDoc(collection(db, 'asignaciones_entrenadores_log'), {
        entrenamiento: fila.nombre,
        sede: fila.sede,
        fds: fila.esMJ ? fila.slot : null,
        fechaEntrenamiento: fila.fechaInicio,
        anterior,
        nuevo: nuevoEntrenador || '(sin asignar)',
        porNombre: currentUser?.name || '',
        porEmail: currentUser?.email || '',
        fechaIso: new Date().toISOString(),
      });

      showToast(
        nuevoEntrenador
          ? `${nuevoEntrenador} asignado a ${fila.nombre}${fila.esMJ ? ` (${fila.slot})` : ''} — ${fila.sede}.`
          : `Asignación retirada de ${fila.nombre}.`,
        'success'
      );
    } catch (e) {
      console.error(e);
      showToast('No se pudo guardar la asignación: ' + e.message, 'error');
    } finally {
      setGuardando('');
    }
  };

  // ------------------------------------------------------------------------
  if (!autorizado) {
    return (
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
        <ShieldCheck size={44} style={{ color: 'var(--crear-gold)', marginBottom: '1rem' }} />
        <h2 style={{ color: 'var(--text-heading)' }}>Acceso restringido</h2>
        <p className="text-muted" style={{ maxWidth: 520, margin: '0.8rem auto 1.5rem' }}>
          El Asignador Oficial de Entrenadores está disponible únicamente para Dirección
          (Fer Aragón, Paul Sosa y José Sánchez).
        </p>
        <button className="btn-secondary" onClick={() => navigate('/home')}>Volver a Mi Inicio</button>
      </div>
    );
  }

  const card = {
    background: 'var(--bg-card, rgba(255,255,255,0.03))',
    border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
    borderRadius: '14px', padding: '1rem 1.1rem'
  };
  const selectStyle = {
    padding: '0.4rem 0.55rem', borderRadius: '8px',
    border: '1px solid var(--border-color, rgba(255,255,255,0.15))',
    background: 'var(--bg-input, rgba(0,0,0,0.25))', color: 'var(--text-heading)',
    fontSize: '0.82rem', width: '100%'
  };

  return (
    <div style={{ padding: '1.2rem 1.4rem 3rem', maxWidth: 1500, margin: '0 auto' }}>
      {/* ---------------- Encabezado ---------------- */}
      <div style={{ ...card, marginBottom: '1.1rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.9rem', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/home')} title="Volver"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.3rem' }}>
            <ArrowLeft size={22} />
          </button>
          <div style={{ flex: '1 1 340px' }}>
            <h1 style={{ margin: 0, fontSize: '1.45rem', color: 'var(--text-heading)', fontWeight: 800 }}>
              Asignador Oficial de Entrenadores &amp; Cronograma Maestro
            </h1>
            <p className="text-muted" style={{ margin: '0.3rem 0 0', fontSize: '0.84rem' }}>
              Entrenamientos del calendario oficial ({events?.length || 0} eventos) ·{' '}
              {Object.keys(asignaciones).length} con asignación guardada en Causa OS
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button onClick={() => setTab('trazabilidad')}
              style={{ ...selectStyle, width: 'auto', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <History size={15} /> Trazabilidad ({trazas.length})
            </button>
            <button onClick={() => navigate('/monitor-vuelos')}
              style={{ ...selectStyle, width: 'auto', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Plane size={15} /> Vuelos y Cartas
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- KPIs ---------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.8rem', marginBottom: '1.1rem' }}>
        <div style={card}>
          <div className="text-muted" style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em' }}>
            <Calendar size={13} style={{ verticalAlign: '-2px' }} /> ENTRENAMIENTOS
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--text-heading)' }}>{kpis.total}</div>
        </div>
        <div style={card}>
          <div className="text-muted" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
            <CheckCircle2 size={13} style={{ verticalAlign: '-2px' }} /> CON ENTRENADOR
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#10b981' }}>
            {kpis.conEntrenador} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>({kpis.pct}%)</span>
          </div>
        </div>
        <div style={card}>
          <div className="text-muted" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
            <AlertTriangle size={13} style={{ verticalAlign: '-2px' }} /> POR ASIGNAR
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: kpis.pendientes > 0 ? '#f59e0b' : 'var(--text-heading)' }}>
            {kpis.pendientes}
          </div>
          {kpis.pendientes > 0 && (
            <button onClick={() => { setFiltroEntrenador('pendientes'); setTab('matriz'); }}
              style={{ marginTop: '0.35rem', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', border: '1px solid #f59e0b', background: 'transparent', color: '#f59e0b', cursor: 'pointer' }}>
              Ver pendientes
            </button>
          )}
        </div>
        <div style={card}>
          <div className="text-muted" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
            <Plane size={13} style={{ verticalAlign: '-2px' }} /> VUELOS REGISTRADOS
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--text-heading)' }}>
            {vuelos === null ? (vuelosError ? '—' : '…') : vuelos.length}
          </div>
          {vuelosError && <div className="text-muted" style={{ fontSize: '0.68rem' }}>sin archivo de vuelos</div>}
        </div>
        <div style={card}>
          <div className="text-muted" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
            <Building2 size={13} style={{ verticalAlign: '-2px' }} /> SEDES CON EVENTOS
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--text-heading)' }}>{kpis.sedes}</div>
        </div>
        <div style={card}>
          <div className="text-muted" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
            <Users size={13} style={{ verticalAlign: '-2px' }} /> ENTRENADORES
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--text-heading)' }}>{entrenadores.length}</div>
        </div>
      </div>

      {/* ---------------- Pestañas ---------------- */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {[
          ['matriz', `Matriz de Asignación (${filasFiltradas.length})`],
          ['carga', `Carga por Entrenador (${carga.filter(c => c.total > 0).length})`],
          ['trazabilidad', `Trazabilidad (${trazas.length})`],
          ['polizas', 'Pólizas Drive'],
        ].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{
              padding: '0.5rem 0.9rem', borderRadius: '10px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
              border: tab === id ? '1px solid var(--crear-gold)' : '1px solid var(--border-color, rgba(255,255,255,0.12))',
              background: tab === id ? 'var(--crear-gold)' : 'transparent',
              color: tab === id ? '#000' : 'var(--text-muted)'
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* ---------------- MATRIZ ---------------- */}
      {tab === 'matriz' && (
        <>
          <div style={{ ...card, marginBottom: '0.9rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.7rem' }}>
            <div>
              <label className="text-muted" style={{ fontSize: '0.7rem', fontWeight: 700 }}>PERÍODO</label>
              <select style={selectStyle} value={periodo} onChange={e => setPeriodo(e.target.value)}>
                <option value="proximos">Próximos (vigentes)</option>
                <option value="pasados">Pasados</option>
                <option value="todos">Todos</option>
              </select>
            </div>
            <div>
              <label className="text-muted" style={{ fontSize: '0.7rem', fontWeight: 700 }}>SEDE</label>
              <select style={selectStyle} value={filtroSede} onChange={e => setFiltroSede(e.target.value)}>
                <option value="todas">Todas las sedes</option>
                {OPERATIONAL_SEDES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-muted" style={{ fontSize: '0.7rem', fontWeight: 700 }}>ENTRENAMIENTO</label>
              <select style={selectStyle} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
                <option value="todos">Todos los tipos</option>
                <option value="mj">Solo Maestría del Juego</option>
                <option value="c1c2">Solo Capítulo 1 y 2</option>
              </select>
            </div>
            <div>
              <label className="text-muted" style={{ fontSize: '0.7rem', fontWeight: 700 }}>ENTRENADOR</label>
              <select style={selectStyle} value={filtroEntrenador} onChange={e => setFiltroEntrenador(e.target.value)}>
                <option value="todos">Todos</option>
                <option value="pendientes">⚠ Solo sin asignar</option>
                {entrenadores.map(e => <option key={e.nombre} value={e.nombre}>{e.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-muted" style={{ fontSize: '0.7rem', fontWeight: 700 }}>BUSCAR</label>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input style={{ ...selectStyle, paddingLeft: '1.8rem' }} value={busqueda}
                  onChange={e => setBusqueda(e.target.value)} placeholder="Equipo, ciudad, salón…" />
              </div>
            </div>
          </div>

          <div style={{ ...card, padding: 0, overflowX: 'auto' }}>
            {loadingEvents ? (
              <div style={{ padding: '2.5rem', textAlign: 'center' }} className="text-muted">Cargando calendario oficial…</div>
            ) : filasFiltradas.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center' }} className="text-muted">
                {(events?.length || 0) === 0
                  ? 'El calendario oficial no devolvió eventos. No se está mostrando nada inventado — si esperabas ver entrenamientos, hay que revisar la conexión con la hoja.'
                  : 'Ningún entrenamiento coincide con los filtros aplicados.'}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', minWidth: 980 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.12))' }}>
                    {['FECHAS', 'SEDE', 'ENTRENAMIENTO', 'FDS (MJ)', 'ENTRENADOR ASIGNADO', 'LUGAR / SALÓN'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '0.7rem 0.8rem', color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filasFiltradas.map(f => {
                    const idFila = `${f.key}__${f.slot}`;
                    const actual = f.entrenadorAsignado || '';
                    const sinAsignar = !actual && !f.entrenadorHoja;
                    return (
                      <tr key={idFila} style={{ borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.06))' }}>
                        <td style={{ padding: '0.65rem 0.8rem', whiteSpace: 'nowrap' }}>
                          <strong style={{ color: 'var(--text-heading)' }}>{fmtFecha(f.fechaInicio)}</strong>
                          {f.fechaFin && <span className="text-muted"> → {fmtFecha(f.fechaFin)}</span>}
                        </td>
                        <td style={{ padding: '0.65rem 0.8rem', whiteSpace: 'nowrap' }}>
                          {getFlagForSede(f.sede)} {f.sede}
                        </td>
                        <td style={{ padding: '0.65rem 0.8rem' }}>
                          {f.nombre}
                          {f.equipo && <span className="text-muted" style={{ fontSize: '0.75rem' }}> · Eq. {f.equipo}</span>}
                        </td>
                        <td style={{ padding: '0.65rem 0.8rem', whiteSpace: 'nowrap' }}>
                          {f.fdsLabel
                            ? <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.35)' }}>{f.fdsLabel}</span>
                            : <span className="text-muted">—</span>}
                        </td>
                        <td style={{ padding: '0.5rem 0.8rem', minWidth: 230 }}>
                          <select
                            style={{ ...selectStyle, borderColor: sinAsignar ? '#f59e0b' : 'var(--border-color, rgba(255,255,255,0.15))' }}
                            value={actual}
                            disabled={guardando === idFila}
                            onChange={e => asignar(f, e.target.value)}
                          >
                            <option value="">
                              {f.entrenadorHoja ? `— (hoja: ${f.entrenadorHoja})` : '— Sin asignar —'}
                            </option>
                            {entrenadores.map(e => <option key={e.nombre} value={e.nombre}>{e.nombre}</option>)}
                          </select>
                          {f.asignadoPor && actual && (
                            <div className="text-muted" style={{ fontSize: '0.68rem', marginTop: 3 }}>
                              por {f.asignadoPor} · {fmtFecha(f.asignadoEn)}
                            </div>
                          )}
                          {!actual && f.entrenadorHoja && (
                            <div className="text-muted" style={{ fontSize: '0.68rem', marginTop: 3 }}>
                              viene de la hoja — elige aquí para fijarlo en Causa OS
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.65rem 0.8rem' }} className="text-muted">{f.lugar || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ---------------- CARGA POR ENTRENADOR ---------------- */}
      {tab === 'carga' && (
        <div style={{ ...card, padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.12))' }}>
                {['ENTRENADOR', 'SEDE', 'TOTAL', 'MAESTRÍA', 'CAPÍTULO 1 Y 2'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '0.7rem 0.9rem', color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 800 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {carga.map(c => (
                <tr key={c.nombre} style={{ borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.06))' }}>
                  <td style={{ padding: '0.6rem 0.9rem', color: 'var(--text-heading)', fontWeight: 600 }}>{c.nombre}</td>
                  <td style={{ padding: '0.6rem 0.9rem' }} className="text-muted">{c.sede ? `${getFlagForSede(c.sede)} ${normalizeSede(c.sede)}` : '—'}</td>
                  <td style={{ padding: '0.6rem 0.9rem', fontWeight: 800, color: c.total === 0 ? 'var(--text-muted)' : 'var(--crear-gold)' }}>{c.total}</td>
                  <td style={{ padding: '0.6rem 0.9rem' }} className="text-muted">{c.mj}</td>
                  <td style={{ padding: '0.6rem 0.9rem' }} className="text-muted">{c.c1c2}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-muted" style={{ padding: '0.7rem 0.9rem', fontSize: '0.74rem', borderTop: '1px solid var(--border-color, rgba(255,255,255,0.08))' }}>
            Conteo sobre los entrenamientos del período seleccionado, sumando tanto lo asignado en Causa OS como lo que ya venía en la hoja.
          </div>
        </div>
      )}

      {/* ---------------- TRAZABILIDAD ---------------- */}
      {tab === 'trazabilidad' && (
        <div style={{ ...card, padding: 0 }}>
          {trazas.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center' }} className="text-muted">
              Todavía no hay movimientos registrados. Cada cambio de entrenador queda aquí con quién lo hizo, cuándo y qué había antes.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.12))' }}>
                  {['CUÁNDO', 'QUIÉN', 'ENTRENAMIENTO', 'ANTES', 'DESPUÉS'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '0.7rem 0.9rem', color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 800 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trazas.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.06))' }}>
                    <td style={{ padding: '0.6rem 0.9rem', whiteSpace: 'nowrap' }} className="text-muted">
                      {t.fechaIso ? new Date(t.fechaIso).toLocaleString('es-PE') : '—'}
                    </td>
                    <td style={{ padding: '0.6rem 0.9rem' }}>{t.porNombre || t.porEmail || '—'}</td>
                    <td style={{ padding: '0.6rem 0.9rem' }}>
                      {t.entrenamiento} <span className="text-muted">· {t.sede}</span>
                      {t.fds && <span style={{ color: '#a78bfa' }}> · {t.fds}</span>}
                    </td>
                    <td style={{ padding: '0.6rem 0.9rem' }} className="text-muted">{t.anterior}</td>
                    <td style={{ padding: '0.6rem 0.9rem', color: '#10b981', fontWeight: 600 }}>{t.nuevo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ---------------- PÓLIZAS ---------------- */}
      {tab === 'polizas' && (
        <div style={{ ...card }}>
          <h3 style={{ marginTop: 0, color: 'var(--text-heading)', fontSize: '1rem' }}>
            <ShieldCheck size={17} style={{ verticalAlign: '-3px' }} /> Auditoría de Pólizas en Drive
          </h3>
          <p className="text-muted" style={{ fontSize: '0.85rem', lineHeight: 1.6, margin: '0.6rem 0 0' }}>
            Esta pestaña todavía <strong>no está conectada</strong>. Causa OS hoy sabe <em>subir</em> archivos a
            Google Drive (<code>googleDriveService.js</code>), pero no tiene permiso de <em>listar</em> una
            carpeta, que es lo que hace falta para leer las pólizas de cada entrenador y calcular
            cuáles están vigentes y cuáles vencidas.
          </p>
          <p className="text-muted" style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
            Se deja declarado en vez de mostrar un número inventado. Para activarlo hace falta
            definir la carpeta de Drive donde viven las pólizas y autorizar el alcance de lectura —
            dímelo y lo conecto.
          </p>
        </div>
      )}
    </div>
  );
}
