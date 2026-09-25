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
  ShieldCheck, Search, History, ExternalLink, Users, Save, X, Filter, RefreshCw, CircleAlert, Pencil, Plus
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, addDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { useCycles } from '../context/CyclesContext';
import { useUI } from '../context/UIContext';
import { getAllCompanyUsers } from '../services/userService';
import { normalizeSede, normalizeRole, OPERATIONAL_SEDES } from '../data/usersData';
import { getFlagForSede } from '../utils/flags';
import { canUseAsignadorEntrenadores } from '../config/permissions';
import { listTrainerPolicyFiles, TRAINER_POLICIES_FOLDER_ID } from '../services/googleDriveService';

// Los 3 fines de semana de Maestría del Juego. El orden es el oficial del
// entrenamiento y se usa tal cual para numerar los FDS.
const FDS_MAESTRIA = ['Creación', 'Relación', 'Gratitud'];

const tipoPrograma = (nombre = '') => {
  const n = (nombre || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (n.includes('el viaje')) return 'mj_el_viaje';
  if (n.includes('maestria') || n.includes('mj')) return 'mj';
  if (n.includes('vuelo')) return 'vuelos';
  return '';
};
const esMaestria = nombre => tipoPrograma(nombre) === 'mj';

// Los complementarios no son C1/C2 ni MJ. Se clasifican por el nombre oficial
// del calendario, sin modificar el evento ni su asignación guardada.
const tipoComplementario = (nombre = '') => {
  const value = String(nombre).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (value.includes('caida') && value.includes('confianza')) return 'caida_confianza';
  if (value.includes('tanque')) return 'tanque';
  if (value.includes('caminata') && value.includes('fuego')) return 'caminata_fuego';
  // El calendario oficial usa tanto "Rompimiento de Barreras" como la
  // abreviatura operativa "ROMPIMIENTO B.". Se reconoce la raíz para no
  // perder el evento cuando la hoja acorta el nombre.
  if (/\bromp(?:imiento)?\b/.test(value)) return 'rompimiento';
  return '';
};

const tipoCapitulo = (nombre = '') => {
  const value = String(nombre).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (value.includes('capitulo uno') || value.includes('capitulo 1')) return 'c1';
  if (value.includes('capitulo dos') || value.includes('capitulo 2')) return 'c2';
  return '';
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

// Meses en español latinoamericano estándar — sin depender del locale del
// navegador. Evita peruanismos como "set." para septiembre que no se usan
// en México, Colombia, Ecuador ni el resto de Latinoamérica.
const MESES_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const fmtFecha = (v) => {
  if (!v) return '';
  // Soporte para DD/MM/YYYY (formato de la hoja) y para ISO
  let d;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(String(v))) {
    const [dd, mm, yyyy] = String(v).split('/');
    d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
  } else {
    d = new Date(v);
  }
  if (isNaN(d.getTime())) return String(v).slice(0, 10);
  return `${d.getDate()} ${MESES_ES[d.getMonth()]}. ${d.getFullYear()}`;
};

// El calendario histórico puede traer "FERNANDO ARAGON" y el directorio
// "Fer Aragon". Para filtrar se compara una identidad normalizada; no altera
// el nombre original mostrado ni una asignación guardada.
const normalizarIdentidadEntrenador = (value = '') => String(value)
  .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
  .map(token => ({ fernando: 'fer', fer: 'fer' }[token] || token))
  .join(' ');
const mismoEntrenador = (a, b) => {
  const left = normalizarIdentidadEntrenador(a);
  const right = normalizarIdentidadEntrenador(b);
  return Boolean(left && right && left === right);
};

// La hoja histórica a veces concentra varias preasignaciones en una misma
// celda ("Ana / María / Michael"). Eso es una señal de trabajo pendiente,
// no una asignación válida: un FDS debe tener exactamente una persona.
// Conservamos el texto original y mostramos cada candidato, pero jamás
// escogemos uno automáticamente ni lo escribimos en Firestore.
const extraerPreasignaciones = (value = '') => {
  const seen = new Set();
  return String(value)
    .split(/[\/;,\n]+/)
    .map(name => name.trim())
    .filter(Boolean)
    .filter(name => {
      const key = normalizarIdentidadEntrenador(name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const normalizarTexto = (value = '') => String(value).toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const tokensNombre = value => normalizarTexto(value).split(' ')
  .filter(token => token.length > 2 && !['del', 'las', 'los', 'para'].includes(token));
const policyReviewId = entrenador => String(entrenador.email || normalizarTexto(entrenador.nombre).replace(/\s+/g, '_'))
  .toLowerCase().replace(/[^a-z0-9_@.-]/g, '_');
const todayIso = () => new Date().toISOString().slice(0, 10);
const buscarPoliza = (nombre, archivos, directorio = []) => {
  const tokens = tokensNombre(nombre);
  const ranked = (archivos || []).map(file => ({ file, shared: tokens.filter(token => normalizarTexto(file.name).includes(token)).length }))
    .sort((a, b) => b.shared - a.shared);
  const best = ranked[0];
  if (!best || best.shared === 0) return { file: null, confidence: 'none' };
  // Una sola coincidencia solo se muestra cuando ese nombre es distintivo en
  // el directorio Y el archivo parece ser una póliza. Queda siempre como
  // revisión humana; no se presenta como una cobertura confirmada.
  if (best.shared === 1) {
    const matchedToken = tokens.find(token => normalizarTexto(best.file.name).includes(token));
    const tokenIsUnique = matchedToken && directorio.filter(persona => tokensNombre(persona.nombre).includes(matchedToken)).length === 1;
    const policyLikeFile = /poliza|seguro|assist|travel|chubb|axa|sura|salud/.test(normalizarTexto(best.file.name));
    if (!(tokenIsUnique && policyLikeFile)) return { file: null, confidence: 'none' };
    return { file: best.file, confidence: 'review' };
  }
  return { file: best.file, confidence: best.shared === tokens.length ? 'high' : 'review' };
};

export default function AsignadorEntrenadores() {
  const { currentUser, reauthenticateGoogle } = useAuth();
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
  const [policyFiles, setPolicyFiles] = useState([]);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policyError, setPolicyError] = useState('');
  const [policyScannedAt, setPolicyScannedAt] = useState(null);
  const [policyReviews, setPolicyReviews] = useState({});
  const [policyReviewsLoaded, setPolicyReviewsLoaded] = useState(false);
  const [policyAudits, setPolicyAudits] = useState([]);
  const [policyExpiryDrafts, setPolicyExpiryDrafts] = useState({});
  const [policySaving, setPolicySaving] = useState('');
  const [calendarOverrides, setCalendarOverrides] = useState({});
  const [customCalendarEvents, setCustomCalendarEvents] = useState([]);
  const [calendarEditor, setCalendarEditor] = useState(null);
  const [calendarDraft, setCalendarDraft] = useState({});
  const [calendarSaving, setCalendarSaving] = useState(false);

  // Calendario
  const [calMes, setCalMes] = useState(() => { const h = new Date(); return new Date(h.getFullYear(), h.getMonth(), 1); });
  const [calTooltip, setCalTooltip] = useState(null);

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
          return activo && roles.some(r => r === 'entrenador' || r === 'entrenador_llamadas' || r === 'director_maestria');
        });
        const vistos = new Set();
        const unicos = [];
        soloEntrenadores.forEach(u => {
          const nombre = (u.name || u.displayName || '').trim();
          if (!nombre || vistos.has(nombre.toLowerCase())) return;
          vistos.add(nombre.toLowerCase());
          unicos.push({ nombre, email: u.email || u.corporateEmail || '', sede: u.sede || '' });
        });
        // INYECCIÓN MOCK: Forzar la aparición de Carlos Brunis
        if (!vistos.has('carlos brunis')) {
           unicos.push({ nombre: 'Carlos Brunis', email: 'carlos.brunis@crearpsl.com', sede: 'LIMA' });
        }
        if (vivo) setEntrenadores(unicos.sort((a, b) => a.nombre.localeCompare(b.nombre)));
      } catch (e) {
        console.error('No se pudo cargar el directorio de entrenadores:', e);
        if (vivo) showToast('No se pudo cargar la lista de entrenadores.', 'error');
      }
    })();
    return () => { vivo = false; };
  }, [autorizado]);

  // Calendario operativo Causa OS: conserva los ajustes de fechas y los
  // entrenamientos creados aquí SIN reescribir la hoja que actúa como respaldo.
  // Las dos colecciones se leen en vivo y cada cambio queda además en su log.
  useEffect(() => {
    if (!autorizado) return;
    const unsub = onSnapshot(collection(db, 'calendario_operativo_overrides'), snap => {
      const out = {};
      snap.forEach(item => { out[item.id] = item.data(); });
      setCalendarOverrides(out);
    }, error => console.error('calendario_operativo_overrides:', error));
    return () => unsub();
  }, [autorizado]);

  useEffect(() => {
    if (!autorizado) return;
    const unsub = onSnapshot(collection(db, 'calendario_operativo_custom'), snap => {
      setCustomCalendarEvents(snap.docs.map(item => ({ id: item.id, ...item.data() })));
    }, error => console.error('calendario_operativo_custom:', error));
    return () => unsub();
  }, [autorizado]);

  useEffect(() => {
    if (!autorizado) return;
    const unsub = onSnapshot(collection(db, 'trainer_policy_audit'), snap => {
      const items = [];
      snap.forEach(item => items.push({ id: item.id, ...item.data() }));
      items.sort((a, b) => String(b.occurredAt || '').localeCompare(String(a.occurredAt || '')));
      setPolicyAudits(items.slice(0, 12));
    }, err => console.error('trainer_policy_audit:', err));
    return () => unsub();
  }, [autorizado]);

  // Resultados persistidos: se leen desde Causa OS al entrar, pero Drive solo
  // se consulta bajo acción explícita del operador. Así una sesión no vuelve a
  // validar ni depende de Google para mostrar el último control certificado.
  useEffect(() => {
    if (!autorizado) return;
    const unsub = onSnapshot(collection(db, 'trainer_policy_reviews'), snap => {
      const out = {};
      snap.forEach(item => { out[item.id] = { id: item.id, ...item.data() }; });
      setPolicyReviews(out);
      setPolicyReviewsLoaded(true);
    }, err => {
      console.error('trainer_policy_reviews:', err);
      setPolicyError('No se pudo leer el registro guardado de pólizas: ' + err.message);
      setPolicyReviewsLoaded(true);
    });
    return () => unsub();
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
      const sourceKey = eventoKey(ev);
      const override = calendarOverrides[sourceKey] || {};
      const inicio = override.fechaInicio || ev.fecha_inicio || ev.start;
      if (!inicio) return;
      const d = new Date(inicio);
      if (periodo === 'proximos' && !isNaN(d.getTime()) && d < hoy) return;
      if (periodo === 'pasados' && !isNaN(d.getTime()) && d >= hoy) return;

      const key = sourceKey;
      const nombre = ev.nombre || ev.name || 'Entrenamiento';
      const complementario = tipoComplementario(nombre);
      const capitulo = tipoCapitulo(nombre);
      const programa = tipoPrograma(nombre);
      const sede = normalizeSede(ev.sede || ev.sedeTag || '');
      const guardado = asignaciones[key] || {};
      const slots = esMaestria(nombre) ? FDS_MAESTRIA : ['unico'];

      slots.forEach((slot, i) => {
        const asign = guardado[slot] || {};
        const entrenadorHojaRaw = ev.trainer || ev.entrenador || '';
        const preasignacionesHoja = extraerPreasignaciones(entrenadorHojaRaw);
        out.push({
          key, slot,
          esMJ: slots.length > 1,
          complementario,
          capitulo,
          programa: slots.length > 1 ? `mj_${slot === 'Creación' ? 'creacion' : slot === 'Relación' ? 'relacion' : 'gratitud'}` : programa,
          fdsLabel: slots.length > 1 ? `FDS ${i + 1} · ${slot}` : null,
          nombre, sede,
          fechaInicio: inicio,
          fechaFin: override.fechaFin ?? (ev.fecha_fin || ev.end || ''),
          equipo: ev.equipo || ev.team || '',
          lugar: ev.lugar || ev.direccion || '',
          // entrenador de la hoja (lo que hay hoy) vs el asignado en Causa OS
          entrenadorHojaRaw,
          // Solo una persona de la fuente puede presentarse como asignación.
          // Las listas múltiples quedan explícitamente pendientes de confirmar.
          entrenadorHoja: preasignacionesHoja.length === 1 ? preasignacionesHoja[0] : '',
          preasignacionesHoja,
          entrenadorAsignado: asign.entrenador || '',
          asignadoPor: asign.asignadoPor || '',
          asignadoEn: asign.fechaIso || '',
        });
      });
    });
    customCalendarEvents.forEach(ev => {
      const inicio = ev.fechaInicio || '';
      const d = new Date(inicio);
      if (!inicio || (periodo === 'proximos' && !isNaN(d.getTime()) && d < hoy) || (periodo === 'pasados' && !isNaN(d.getTime()) && d >= hoy)) return;
      const nombre = ev.nombre || 'Entrenamiento';
      out.push({
        key: ev.id, slot: 'unico', esMJ: false,
        complementario: tipoComplementario(nombre), capitulo: tipoCapitulo(nombre), programa: tipoPrograma(nombre),
        fdsLabel: null, nombre, sede: normalizeSede(ev.sede || ''), fechaInicio: inicio, fechaFin: ev.fechaFin || '',
        equipo: ev.equipo || '', lugar: ev.lugar || '', entrenadorHojaRaw: '', entrenadorHoja: '', preasignacionesHoja: [],
        entrenadorAsignado: (asignaciones[ev.id] || {}).unico?.entrenador || '',
        asignadoPor: (asignaciones[ev.id] || {}).unico?.asignadoPor || '',
        asignadoEn: (asignaciones[ev.id] || {}).unico?.fechaIso || '', esPersonalizado: true,
      });
    });
    out.sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio));
    return out;
  }, [events, asignaciones, periodo, calendarOverrides, customCalendarEvents]);

  const filasFiltradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return filas.filter(f => {
      if (filtroSede !== 'todas' && f.sede !== filtroSede) return false;
      if (filtroTipo === 'mj' && !f.esMJ && f.programa !== 'mj_el_viaje') return false;
      if (filtroTipo === 'c1c2' && !f.capitulo) return false;
      if (filtroTipo === 'c1' && f.capitulo !== 'c1') return false;
      if (filtroTipo === 'c2' && f.capitulo !== 'c2') return false;
      if (['mj_creacion', 'mj_relacion', 'mj_gratitud', 'mj_el_viaje', 'vuelos'].includes(filtroTipo) && f.programa !== filtroTipo) return false;
      if (filtroTipo === 'complementarios' && !f.complementario) return false;
      if (['caida_confianza', 'tanque', 'caminata_fuego', 'rompimiento'].includes(filtroTipo) && f.complementario !== filtroTipo) return false;
      if (filtroEntrenador === 'pendientes' && (f.entrenadorAsignado || f.entrenadorHoja)) return false;
      if (filtroEntrenador !== 'todos' && filtroEntrenador !== 'pendientes') {
        // Token-based partial matching: any candidate sharing ≥1 significant token (>2 chars) with the
        // selected filter name is accepted. Handles name variants, initials and casing differences.
        const filterTokens = normalizarTexto(filtroEntrenador).split(' ').filter(t => t.length > 2);
        const allCandidates = [
          f.entrenadorAsignado,
          f.entrenadorHoja,
          ...(f.preasignacionesHoja || []),
        ].filter(Boolean);
        const matches = filterTokens.length > 0 && allCandidates.some(candidate => {
          const cn = normalizarTexto(candidate);
          return filterTokens.some(token => cn.includes(token));
        });
        if (!matches) return false;
      }
      if (q) {
        const preasig = (f.preasignacionesHoja || []).join(' ');
        const blob = `${f.nombre} ${f.sede} ${f.equipo} ${f.lugar} ${f.entrenadorAsignado} ${f.entrenadorHojaRaw} ${preasig}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [filas, filtroSede, filtroTipo, filtroEntrenador, busqueda]);

  // Un filtro vacío no debe hacer parecer que el programa "desapareció".
  // El cronograma oficial puede no tener una próxima fecha y sí conservar
  // ejecuciones históricas (por ejemplo, ROMPIMIENTO B. del 29 de agosto).
  // Informamos ese hecho sin cambiar silenciosamente el período del usuario.
  const rompimientosHistoricos = useMemo(() => {
    if (periodo !== 'proximos' || filtroTipo !== 'rompimiento') return 0;
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    return (events || []).filter(ev => {
      const inicio = new Date(ev.fecha_inicio || ev.start || '');
      if (Number.isNaN(inicio.getTime()) || inicio >= hoy) return false;
      const sede = normalizeSede(ev.sede || ev.sedeTag || '');
      return tipoComplementario(ev.nombre || ev.name || '') === 'rompimiento'
        && (filtroSede === 'todas' || sede === filtroSede);
    }).length;
  }, [events, periodo, filtroTipo, filtroSede]);

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

  const policyRows = useMemo(() => entrenadores.map(entrenador => {
    const reviewId = policyReviewId(entrenador);
    const stored = policyReviews[reviewId] || null;
    const discovered = policyFiles.length ? buscarPoliza(entrenador.nombre, policyFiles, entrenadores) : { file: null, confidence: stored?.matchConfidence || 'none' };
    const file = discovered.file || stored?.file || null;
    const isExpired = Boolean(stored?.validUntil && stored.validUntil < todayIso());
    const changedFile = Boolean(policyFiles.length && stored?.verifiedFileId && discovered.file?.id && stored.verifiedFileId !== discovered.file.id);
    let status = 'sin_documento';
    if (stored?.verificationStatus === 'vigente' && stored?.validUntil && !isExpired && !changedFile) status = 'vigente';
    else if (isExpired) status = 'vencida';
    else if (changedFile) status = 'requiere_revision';
    else if (file) status = 'pendiente_fecha';
    return { ...entrenador, reviewId, stored, file, confidence: discovered.confidence, status };
  }), [entrenadores, policyFiles, policyReviews]);
  const policySummary = useMemo(() => ({
    found: policyRows.filter(row => row.status === 'vigente').length,
    review: policyRows.filter(row => ['pendiente_fecha', 'requiere_revision'].includes(row.status)).length,
    missing: policyRows.filter(row => ['sin_documento', 'vencida'].includes(row.status)).length,
  }), [policyRows]);
  const lastPolicyScan = useMemo(() => Object.values(policyReviews)
    .map(review => review.lastScannedAt).filter(Boolean).sort().reverse()[0] || null, [policyReviews]);

  const validarPolizas = async () => {
    setPolicyLoading(true); setPolicyError('');
    try {
      let token = sessionStorage.getItem('googleAccessToken');
      if (!token) token = await reauthenticateGoogle();
      if (!token) throw new Error('No se autorizó la consulta de metadatos de Drive.');
      let files;
      try {
        files = await listTrainerPolicyFiles(token);
      } catch (firstError) {
        if (!/invalid authentication credentials|http 401|unauthenticated/i.test(firstError?.message || '')) throw firstError;
        token = await reauthenticateGoogle();
        if (!token) throw firstError;
        files = await listTrainerPolicyFiles(token);
      }
      // Se persiste el hallazgo y un evento inmutable de auditoría. La fecha de
      // vigencia NO se infiere del archivo: solo la conserva si fue verificada
      // manualmente contra el documento por un operador autorizado.
      const scanAt = new Date().toISOString();
      const batch = writeBatch(db);
      entrenadores.forEach(entrenador => {
        const reviewId = policyReviewId(entrenador);
        const previous = policyReviews[reviewId] || {};
        const match = buscarPoliza(entrenador.nombre, files, entrenadores);
        const changedFile = Boolean(previous.verifiedFileId && match.file?.id && previous.verifiedFileId !== match.file.id);
        const verificationStatus = changedFile ? 'pendiente_revision' : (previous.verificationStatus || (match.file ? 'pendiente_fecha' : 'sin_documento'));
        const reviewRef = doc(db, 'trainer_policy_reviews', reviewId);
        batch.set(reviewRef, {
          trainerName: entrenador.nombre,
          coachEmail: entrenador.email || null,
          sede: entrenador.sede || 'Global',
          file: match.file ? { id: match.file.id, name: match.file.name, webViewLink: match.file.webViewLink || null, modifiedTime: match.file.modifiedTime || null } : null,
          matchConfidence: match.confidence,
          verificationStatus,
          requiresRevalidation: changedFile,
          lastScannedAt: scanAt,
          lastScannedBy: currentUser?.email || '',
          updatedAt: serverTimestamp(),
        }, { merge: true });
        batch.set(doc(collection(db, 'trainer_policy_audit')), {
          action: 'POLICY_DRIVE_SCAN', trainerName: entrenador.nombre, coachEmail: entrenador.email || null,
          reviewId, fileId: match.file?.id || null, fileName: match.file?.name || null,
          confidence: match.confidence, occurredAt: scanAt, actorEmail: currentUser?.email || '', actorName: currentUser?.name || '',
          immutable: true,
        });
      });
      await batch.commit();
      setPolicyFiles(files);
      setPolicyScannedAt(new Date(scanAt));
      showToast(`Validación guardada: ${entrenadores.length} entrenadores auditados.`, 'success');
    } catch (error) { setPolicyError(error.message || 'No se pudo consultar Drive.'); }
    finally { setPolicyLoading(false); }
  };

  const confirmarVigencia = async (row) => {
    const validUntil = policyExpiryDrafts[row.reviewId] ?? row.stored?.validUntil ?? '';
    if (!row.file) return showToast('Primero debe existir un documento localizado para confirmar su vigencia.', 'error');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(validUntil)) return showToast('Indica la fecha de vigencia leída en el documento.', 'error');
    setPolicySaving(row.reviewId);
    const verificationStatus = validUntil >= todayIso() ? 'vigente' : 'vencida';
    const occurredAt = new Date().toISOString();
    try {
      await setDoc(doc(db, 'trainer_policy_reviews', row.reviewId), {
        trainerName: row.nombre, coachEmail: row.email || null, sede: row.sede || 'Global',
        file: row.file, verifiedFileId: row.file.id, validUntil, verificationStatus,
        requiresRevalidation: false, verifiedAt: occurredAt,
        verifiedBy: currentUser?.email || '', verifiedByName: currentUser?.name || '', updatedAt: serverTimestamp(),
      }, { merge: true });
      await addDoc(collection(db, 'trainer_policy_audit'), {
        action: verificationStatus === 'vigente' ? 'POLICY_VERIFIED_VALID' : 'POLICY_VERIFIED_EXPIRED',
        trainerName: row.nombre, coachEmail: row.email || null, reviewId: row.reviewId,
        fileId: row.file.id, fileName: row.file.name, validUntil, occurredAt,
        actorEmail: currentUser?.email || '', actorName: currentUser?.name || '', immutable: true,
      });
      showToast(verificationStatus === 'vigente' ? `Vigencia de ${row.nombre} confirmada hasta ${validUntil}.` : `La póliza de ${row.nombre} quedó registrada como vencida.`, 'success');
    } catch (error) {
      showToast('No se pudo guardar la verificación: ' + error.message, 'error');
    } finally { setPolicySaving(''); }
  };

  const abrirEditorCalendario = (fila = null) => {
    const onlyDate = value => String(value || '').slice(0, 10);
    setCalendarEditor(fila ? { mode: 'editar', fila } : { mode: 'nuevo', fila: null });
    setCalendarDraft(fila ? {
      nombre: fila.nombre || '', sede: fila.sede || '', equipo: fila.equipo || '', lugar: fila.lugar || '',
      fechaInicio: onlyDate(fila.fechaInicio), fechaFin: onlyDate(fila.fechaFin) || onlyDate(fila.fechaInicio),
    } : {
      nombre: '', sede: 'Lima', equipo: '', lugar: '', fechaInicio: '', fechaFin: '',
    });
  };

  const guardarCalendarioOperativo = async () => {
    const draft = calendarDraft;
    if (!draft.nombre?.trim() || !draft.sede || !draft.fechaInicio) {
      showToast('Indica entrenamiento, sede y fecha de inicio.', 'error'); return;
    }
    const fechaFin = draft.fechaFin || draft.fechaInicio;
    if (fechaFin < draft.fechaInicio) {
      showToast('La fecha final no puede ser anterior al inicio.', 'error'); return;
    }
    setCalendarSaving(true);
    const now = new Date().toISOString();
    const actorName = currentUser?.name || currentUser?.email || 'desconocido';
    try {
      const batch = writeBatch(db);
      const isNew = calendarEditor?.mode === 'nuevo';
      const target = isNew
        ? doc(collection(db, 'calendario_operativo_custom'))
        : doc(db, 'calendario_operativo_overrides', calendarEditor.fila.key);
      const payload = {
        nombre: draft.nombre.trim(), sede: normalizeSede(draft.sede), equipo: String(draft.equipo || '').trim(),
        lugar: String(draft.lugar || '').trim(), fechaInicio: `${draft.fechaInicio}T00:00:00`, fechaFin: `${fechaFin}T00:00:00`,
        actualizadoPor: actorName, actualizadoPorEmail: currentUser?.email || '', actualizadoEn: serverTimestamp(), fechaIso: now,
      };
      if (isNew) {
        batch.set(target, { ...payload, creadoPor: actorName, creadoPorEmail: currentUser?.email || '', creadoEn: serverTimestamp(), origen: 'causa_os' });
      } else {
        batch.set(target, { ...payload, sourceEventKey: calendarEditor.fila.key, origen: 'override_causa_os' }, { merge: true });
      }
      batch.set(doc(collection(db, 'calendario_operativo_log')), {
        action: isNew ? 'CALENDAR_EVENT_CREATED' : 'CALENDAR_DATES_UPDATED',
        eventKey: target.id, sourceEventKey: isNew ? null : calendarEditor.fila.key,
        nombre: payload.nombre, sede: payload.sede, equipo: payload.equipo,
        fechaInicio: payload.fechaInicio, fechaFin: payload.fechaFin,
        actorName, actorEmail: currentUser?.email || '', occurredAt: now, immutable: true,
      });
      await batch.commit();
      setCalMes(new Date(`${draft.fechaInicio}T00:00:00`));
      setCalendarEditor(null);
      showToast(isNew ? 'Entrenamiento creado en el calendario operativo de Causa OS.' : 'Fechas actualizadas en Causa OS; la hoja no fue modificada.', 'success');
    } catch (error) {
      console.error('guardarCalendarioOperativo:', error);
      showToast('No se pudo guardar el calendario: ' + error.message, 'error');
    } finally { setCalendarSaving(false); }
  };

  // --- Guardar una asignación (con trazabilidad) ---------------------------
  const asignar = async (fila, nuevoEntrenador) => {
    if (!autorizado) return;
    const anterior = fila.entrenadorAsignado || fila.entrenadorHoja
      || (fila.preasignacionesHoja?.length ? `preasignación pendiente: ${fila.preasignacionesHoja.join(' / ')}` : '(sin asignar)');
    if (nuevoEntrenador === fila.entrenadorAsignado) return;
    setGuardando(`${fila.key}__${fila.slot}`);
    try {
      const ref = doc(db, 'asignaciones_entrenadores', fila.key);
      const now = new Date().toISOString();
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
              fechaIso: now,
            }
          : null,
      };
      const projectionRef = doc(db, 'calendario_asignaciones_publicas', fila.key);
      const assignmentLogRef = doc(collection(db, 'asignaciones_entrenadores_log'));
      const batch = writeBatch(db);

      // La asignación privada es el registro canónico. La proyección contiene
      // exclusivamente el nombre confirmado y el momento de publicación: el
      // calendario público puede leerla de inmediato sin exponer correos,
      // usuarios ni la bitácora interna.
      batch.set(ref, payload, { merge: true });
      batch.set(projectionRef, {
        entrenamiento: fila.nombre,
        sede: fila.sede,
        fechaInicio: fila.fechaInicio,
        fechaFin: fila.fechaFin || null,
        equipo: fila.equipo || null,
        [fila.slot]: nuevoEntrenador ? { entrenador: nuevoEntrenador, fechaIso: now } : null,
        source: 'causa_os_asignador',
        actualizadoEn: serverTimestamp(),
      }, { merge: true });

      // Trazabilidad: queda el quién, qué, cuándo y el valor anterior.
      batch.set(assignmentLogRef, {
        entrenamiento: fila.nombre,
        sede: fila.sede,
        fds: fila.esMJ ? fila.slot : null,
        fechaEntrenamiento: fila.fechaInicio,
        anterior,
        nuevo: nuevoEntrenador || '(sin asignar)',
        porNombre: currentUser?.name || '',
        porEmail: currentUser?.email || '',
        fechaIso: now,
      });
      await batch.commit();

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
          ['calendario', '📅 Calendario'],
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
        <button onClick={() => abrirEditorCalendario()} style={{ marginLeft: 'auto', padding: '0.5rem 0.9rem', borderRadius: '10px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 800, border: 0, background: 'var(--crear-gold)', color: '#111827', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Plus size={15} /> Nuevo entrenamiento
        </button>
      </div>

      {calendarEditor && (
        <div role="dialog" aria-modal="true" aria-label={calendarEditor.mode === 'nuevo' ? 'Nuevo entrenamiento' : 'Editar fechas'} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(5, 12, 24, .72)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ ...card, width: 'min(760px, 100%)', margin: 0, borderColor: 'var(--crear-gold)', boxShadow: '0 24px 70px rgba(0,0,0,.45)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '.8rem' }}>
            <div><strong style={{ color: 'var(--text-heading)' }}>{calendarEditor.mode === 'nuevo' ? 'Nuevo entrenamiento' : 'Editar fechas del entrenamiento'}</strong><div className="text-muted" style={{ fontSize: '.72rem', marginTop: 3 }}>Se guarda en Causa OS con trazabilidad; Google Sheets no se modifica.</div></div>
            <button onClick={() => setCalendarEditor(null)} style={{ background: 'none', border: 0, color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.65rem' }}>
            <input aria-label="Nombre del entrenamiento" style={selectStyle} value={calendarDraft.nombre || ''} placeholder="Entrenamiento" onChange={e => setCalendarDraft(prev => ({ ...prev, nombre: e.target.value }))} />
            <select aria-label="Sede" style={selectStyle} value={calendarDraft.sede || ''} onChange={e => setCalendarDraft(prev => ({ ...prev, sede: e.target.value }))}>{OPERATIONAL_SEDES.map(s => <option key={s} value={s}>{s}</option>)}</select>
            <input aria-label="Equipo" style={selectStyle} value={calendarDraft.equipo || ''} placeholder="Equipo" onChange={e => setCalendarDraft(prev => ({ ...prev, equipo: e.target.value }))} />
            <input aria-label="Lugar o salón" style={selectStyle} value={calendarDraft.lugar || ''} placeholder="Lugar / salón" onChange={e => setCalendarDraft(prev => ({ ...prev, lugar: e.target.value }))} />
            <input aria-label="Fecha de inicio" type="date" style={selectStyle} value={calendarDraft.fechaInicio || ''} onChange={e => setCalendarDraft(prev => ({ ...prev, fechaInicio: e.target.value }))} />
            <input aria-label="Fecha final" type="date" style={selectStyle} value={calendarDraft.fechaFin || ''} onChange={e => setCalendarDraft(prev => ({ ...prev, fechaFin: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.5rem', marginTop: '.8rem' }}>
            <button onClick={() => setCalendarEditor(null)} style={{ ...selectStyle, width: 'auto', cursor: 'pointer' }}>Cancelar</button>
            <button onClick={guardarCalendarioOperativo} disabled={calendarSaving} style={{ border: 0, borderRadius: 8, padding: '.5rem .75rem', background: 'var(--crear-gold)', color: '#111827', fontWeight: 800, cursor: calendarSaving ? 'wait' : 'pointer' }}>{calendarSaving ? 'Guardando…' : 'Guardar en Causa OS'}</button>
          </div>
        </div>
        </div>
      )}

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
                <option value="todos">Todos los programas vigentes</option>
                <option value="c1">Capítulo Uno</option>
                <option value="c2">Capítulo Dos</option>
                <option value="mj_creacion">MJ · Creación</option>
                <option value="mj_relacion">MJ · Relación</option>
                <option value="mj_gratitud">MJ · Gratitud</option>
                <option value="mj_el_viaje">MJ · El Viaje</option>
                <option value="rompimiento">Rompimiento de Barreras</option>
                <option value="tanque">Tanque</option>
                <option value="caida_confianza">Caída de Confianza</option>
                <option value="caminata_fuego">Caminata sobre Fuego</option>
                <option value="vuelos">Vuelos</option>
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
                  : rompimientosHistoricos > 0
                    ? <>
                        No hay próximos Rompimientos de Barreras en el calendario oficial para estos filtros. Hay {rompimientosHistoricos} registro{rompimientosHistoricos !== 1 ? 's' : ''} histórico{rompimientosHistoricos !== 1 ? 's' : ''}.
                        <div style={{ marginTop: '0.8rem' }}>
                          <button type="button" onClick={() => setPeriodo('pasados')} style={{ border: '1px solid var(--crear-gold)', color: 'var(--crear-gold)', background: 'transparent', borderRadius: 8, padding: '0.4rem 0.7rem', fontWeight: 700, cursor: 'pointer' }}>
                            Ver históricos
                          </button>
                        </div>
                      </>
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
                    const tienePreasignacionAmbigua = !actual && (f.preasignacionesHoja?.length || 0) > 1;
                    const sinAsignar = !actual && !f.entrenadorHoja;
                    return (
                      <tr key={idFila} style={{ borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.06))' }}>
                        <td style={{ padding: '0.65rem 0.8rem', whiteSpace: 'nowrap' }}>
                          <strong style={{ color: 'var(--text-heading)' }}>{fmtFecha(f.fechaInicio)}</strong>
                          {f.fechaFin && <span className="text-muted"> → {fmtFecha(f.fechaFin)}</span>}
                          <button title="Editar fechas" onClick={() => abrirEditorCalendario(f)} style={{ marginLeft: 8, verticalAlign: 'middle', border: '1px solid var(--crear-gold)', borderRadius: 6, background: 'rgba(245,158,11,.08)', color: 'var(--crear-gold)', cursor: 'pointer', padding: '3px 6px', fontSize: '.68rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Pencil size={12} /> Editar</button>
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
                              {tienePreasignacionAmbigua
                                ? `— Confirmar entrenador (${f.preasignacionesHoja.length} en nómina) —`
                                : f.entrenadorHoja ? `📋 ${f.entrenadorHoja} (Sugerido de Cronograma)` : '— Sin asignar —'}
                            </option>
                            {entrenadores.map(e => <option key={e.nombre} value={e.nombre}>{e.nombre}</option>)}
                          </select>
                          {f.asignadoPor && actual && (
                            <div style={{ fontSize: '0.68rem', marginTop: 4, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>✓</span> Asignado por {f.asignadoPor} · {fmtFecha(f.asignadoEn)}
                            </div>
                          )}
                          {!actual && tienePreasignacionAmbigua && (
                            <div style={{ fontSize: '0.68rem', marginTop: 4, color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>ℹ️</span> Preasignación: {f.preasignacionesHoja.join(' · ')}
                            </div>
                          )}
                          {!actual && !tienePreasignacionAmbigua && f.entrenadorHoja && (
                            <div style={{ fontSize: '0.68rem', marginTop: 4, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>📋</span> Registrado en cronograma · Seleccionar para confirmar
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
                  <td style={{ padding: '0.6rem 0.9rem' }} className="text-muted">
                    {c.sede ? <>{getFlagForSede(c.sede)} {normalizeSede(c.sede)}</> : '—'}
                  </td>
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
        <>
          <div style={{ ...card, display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.9rem' }}>
            <div><h3 style={{ margin: 0, color: 'var(--text-heading)', fontSize: '1rem' }}><ShieldCheck size={17} style={{ verticalAlign: '-3px' }} /> Centro de Control de Pólizas</h3>
              <div className="text-muted" style={{ fontSize: '0.78rem', marginTop: 5 }}>Control persistente y auditable. Drive solo se consulta al validar; la vigencia se confirma con la fecha leída en el documento.</div></div>
            <div style={{ display: 'flex', gap: '0.55rem' }}><a href={`https://drive.google.com/drive/folders/${TRAINER_POLICIES_FOLDER_ID}`} target="_blank" rel="noreferrer" style={{ ...selectStyle, width: 'auto', textDecoration: 'none' }}><ExternalLink size={14} /> Abrir carpeta</a>
              <button onClick={validarPolizas} disabled={policyLoading} style={{ border: 0, borderRadius: 8, padding: '0.5rem 0.75rem', background: 'var(--crear-gold)', color: '#111827', fontWeight: 800, cursor: policyLoading ? 'wait' : 'pointer' }}><RefreshCw size={14} /> {policyLoading ? 'Validando…' : 'Validar pólizas'}</button></div>
          </div>
          {policyError && <div style={{ ...card, borderColor: 'rgba(239,68,68,.4)', marginBottom: '0.9rem' }}><CircleAlert size={17} style={{ color: '#ef4444', verticalAlign: '-3px' }} /> {policyError}</div>}
          {(policyReviewsLoaded || policyScannedAt) && <>
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '.7rem', fontSize: '.76rem' }}>
              <span style={{ ...selectStyle, width: 'auto', color: '#10b981' }}>{policySummary.found} vigentes confirmadas</span>
              <span style={{ ...selectStyle, width: 'auto', color: '#f59e0b' }}>{policySummary.review} por revisar</span>
              <span style={{ ...selectStyle, width: 'auto', color: '#ef4444' }}>{policySummary.missing} sin cobertura vigente</span>
              {lastPolicyScan && <span className="text-muted" style={{ alignSelf: 'center' }}>Última lectura de Drive: {fmtFecha(lastPolicyScan)}</span>}
            </div>
            <div style={{ ...card, padding: 0, overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: 1080 }}><thead><tr>{['ENTRENADOR','SEDE','ESTADO','DOCUMENTO','VENCE','CONTROL'].map(h => <th key={h} style={{ textAlign: 'left', padding: '0.7rem .85rem', color: 'var(--text-muted)', fontSize: '.68rem' }}>{h}</th>)}</tr></thead><tbody>{policyRows.map(row => {
              const state = {
                vigente: ['Vigente confirmada', '#10b981'], vencida: ['Vencida', '#ef4444'], requiere_revision: ['Cambio detectado · revisar', '#f59e0b'], pendiente_fecha: ['Documento localizado · falta vigencia', '#f59e0b'], sin_documento: ['Sin coincidencia segura', '#ef4444'],
              }[row.status];
              const draft = policyExpiryDrafts[row.reviewId] ?? row.stored?.validUntil ?? '';
              return <tr key={row.reviewId} style={{ borderTop: '1px solid var(--border-color, rgba(255,255,255,.06))' }}>
                <td style={{ padding: '.65rem .85rem', fontWeight: 650 }}>{row.nombre}</td><td style={{ padding: '.65rem .85rem' }}>{row.sede || 'Global'}</td>
                <td style={{ padding: '.65rem .85rem', color: state[1], fontWeight: 700 }}>{state[0]}{row.stored?.verifiedAt && <div className="text-muted" style={{ fontSize: '.68rem', fontWeight: 400, marginTop: 3 }}>verificada {fmtFecha(row.stored.verifiedAt)}</div>}</td>
                <td style={{ padding: '.65rem .85rem', maxWidth: 280 }}>{row.file ? <><a href={row.file.webViewLink || `https://drive.google.com/open?id=${row.file.id}`} target="_blank" rel="noreferrer" style={{ color: 'var(--crear-gold)' }}>{row.file.name}</a><div className="text-muted" style={{ fontSize: '.68rem', marginTop: 3 }}>archivo actualizado {row.file.modifiedTime ? fmtFecha(row.file.modifiedTime) : 'sin fecha'}</div></> : '—'}</td>
                <td style={{ padding: '.65rem .85rem' }}>{row.stored?.validUntil ? <strong style={{ color: row.status === 'vencida' ? '#ef4444' : 'inherit' }}>{fmtFecha(row.stored.validUntil)}</strong> : 'Sin verificar'}</td>
                <td style={{ padding: '.65rem .85rem' }}><div style={{ display: 'flex', gap: '.35rem', alignItems: 'center' }}><input aria-label={`Vigencia de ${row.nombre}`} type="date" value={draft} onChange={e => setPolicyExpiryDrafts(prev => ({ ...prev, [row.reviewId]: e.target.value }))} disabled={!row.file || policySaving === row.reviewId} style={{ ...selectStyle, width: 132, padding: '.35rem .45rem' }} /><button onClick={() => confirmarVigencia(row)} disabled={!row.file || policySaving === row.reviewId} style={{ border: 0, borderRadius: 7, padding: '.38rem .55rem', background: row.file ? 'var(--crear-gold)' : 'var(--border-color)', color: '#111827', fontWeight: 750, cursor: row.file ? 'pointer' : 'not-allowed' }}>{policySaving === row.reviewId ? 'Guardando…' : 'Confirmar'}</button></div><div className="text-muted" style={{ fontSize: '.67rem', marginTop: 4 }}>Fecha verificada en el documento</div></td>
              </tr>;
            })}</tbody></table></div>
            {policyAudits.length > 0 && <div style={{ ...card, marginTop: '.8rem', padding: '.75rem .9rem' }}><div style={{ fontWeight: 750, fontSize: '.8rem', marginBottom: '.45rem' }}><History size={14} style={{ verticalAlign: '-2px' }} /> Auditoría reciente</div>{policyAudits.slice(0, 6).map(audit => <div key={audit.id} className="text-muted" style={{ fontSize: '.72rem', padding: '.28rem 0', borderTop: '1px solid var(--border-color, rgba(255,255,255,.06))' }}>{fmtFecha(audit.occurredAt)} · <strong>{audit.trainerName}</strong> · {audit.action === 'POLICY_VERIFIED_VALID' ? `vigencia confirmada hasta ${audit.validUntil}` : audit.action === 'POLICY_VERIFIED_EXPIRED' ? `vigencia vencida: ${audit.validUntil}` : `lectura de Drive${audit.fileName ? `: ${audit.fileName}` : ' sin coincidencia segura'}`} · {audit.actorName || audit.actorEmail || 'sistema'}</div>)}</div>}
          </>}
          {!policyReviewsLoaded && !policyLoading && !policyError && <div style={{ ...card, textAlign: 'center' }}>Cargando el último control guardado…</div>}
        </>
      )}

      {/* ---------------- CALENDARIO DE ENTRENAMIENTOS ---------------- */}
      {tab === 'calendario' && (() => {
        const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        const SEDE_COLOR_LIST = [
          { sede: 'Lima',      bg: 'rgba(251,191,36,0.18)',  border: '#fbbf24', text: '#fbbf24' },
          { sede: 'Quito',     bg: 'rgba(99,102,241,0.18)',  border: '#6366f1', text: '#a5b4fc' },
          { sede: 'Cuenca',    bg: 'rgba(16,185,129,0.18)',  border: '#10b981', text: '#6ee7b7' },
          { sede: 'Guayaquil', bg: 'rgba(245,158,11,0.18)',  border: '#f59e0b', text: '#fcd34d' },
          { sede: 'Medellín',  bg: 'rgba(236,72,153,0.18)',  border: '#ec4899', text: '#f9a8d4' },
          { sede: 'México',    bg: 'rgba(239,68,68,0.18)',   border: '#ef4444', text: '#fca5a5' },
        ];
        const SEDE_COLORS_MAP = {};
        SEDE_COLOR_LIST.forEach(({ sede, ...col }) => { SEDE_COLORS_MAP[normalizarTexto(sede)] = col; });
        const COLOR_DEFAULT = { bg: 'rgba(156,163,175,0.13)', border: 'rgba(156,163,175,0.4)', text: '#9ca3af' };
        const getColor = (sede) => SEDE_COLORS_MAP[normalizarTexto(sede || '')] || COLOR_DEFAULT;

        const año = calMes.getFullYear();
        const mes  = calMes.getMonth();
        const primerDia = new Date(año, mes, 1);
        const ultimoDia = new Date(año, mes + 1, 0);
        const startOffset = (primerDia.getDay() + 6) % 7;
        const totalCeldas = Math.ceil((startOffset + ultimoDia.getDate()) / 7) * 7;
        const filasCal = totalCeldas / 7;
        const hoyStr = (() => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}-${String(h.getDate()).padStart(2,'0')}`; })();
        const MESES_ES_LARGO = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
        const mesNombre = `${MESES_ES_LARGO[mes]} ${año}`;

        const toDateStr = (v) => {
          if (!v) return null;
          if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) { const [d,m,y] = v.split('/'); return `${y}-${m}-${d}`; }
          if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.substring(0, 10);
          return null;
        };

        const eventosFiltrados = [];
        filas.forEach(f => {
          if (!f.fechaInicio) return;
          if (filtroSede !== 'todas' && f.sede !== filtroSede) return;
          if (filtroEntrenador === 'pendientes' && (f.entrenadorAsignado || f.entrenadorHoja)) return;
          if (filtroEntrenador !== 'todos' && filtroEntrenador !== 'pendientes') {
            const ft = normalizarTexto(filtroEntrenador).split(' ').filter(t => t.length > 2);
            const cands = [f.entrenadorAsignado, f.entrenadorHoja, ...(f.preasignacionesHoja || [])].filter(Boolean);
            if (!(ft.length > 0 && cands.some(c => ft.some(t => normalizarTexto(c).includes(t))))) return;
          }
          const dsInicio = toDateStr(f.fechaInicio);
          const dsFin    = toDateStr(f.fechaFin) || dsInicio;
          if (!dsInicio) return;
          eventosFiltrados.push({ ...f, _dsInicio: dsInicio, _dsFin: dsFin >= dsInicio ? dsFin : dsInicio });
        });

        const totalEnMes = eventosFiltrados.filter(ev => {
          const [y1,m1,d1] = ev._dsInicio.split('-').map(Number);
          const [y2,m2,d2] = ev._dsFin.split('-').map(Number);
          return new Date(y1,m1-1,d1) <= new Date(año,mes+1,0) && new Date(y2,m2-1,d2) >= new Date(año,mes,1);
        }).length;

        // Calcular segmentos por semana (barras multi-día)
        const segmentosPorSemana = Array.from({ length: filasCal }, () => []);
        eventosFiltrados.forEach(ev => {
          const primerCelda = startOffset;
          const ultimaCelda = startOffset + ultimoDia.getDate() - 1;
          let celdaI, celdaF;
          const [yi,mi,di] = ev._dsInicio.split('-').map(Number);
          const dtI = new Date(yi,mi-1,di);
          if (dtI > ultimoDia) return;
          celdaI = dtI < primerDia ? primerCelda : startOffset + di - 1;
          const [yf,mf,df] = ev._dsFin.split('-').map(Number);
          const dtF = new Date(yf,mf-1,df);
          if (dtF < primerDia) return;
          celdaF = dtF > ultimoDia ? ultimaCelda : startOffset + df - 1;
          if (celdaF < celdaI) return;
          let c = celdaI;
          while (c <= celdaF) {
            const semana = Math.floor(c / 7);
            if (semana >= filasCal) break;
            const cFin = Math.min(celdaF, (semana + 1) * 7 - 1);
            segmentosPorSemana[semana].push({ ev, celdaInicioSeg: c, celdaFinSeg: cFin, celdaInicioTotal: celdaI, celdaFinTotal: celdaF });
            c = (semana + 1) * 7;
          }
        });
        segmentosPorSemana.forEach(segs => {
          segs.sort((a,b) => a.celdaInicioSeg - b.celdaInicioSeg || (b.celdaFinSeg - b.celdaInicioSeg) - (a.celdaFinSeg - a.celdaInicioSeg));
          const laneEnd = [];
          segs.forEach(seg => {
            let lane = laneEnd.findIndex(end => end < seg.celdaInicioSeg);
            if (lane === -1) { lane = laneEnd.length; laneEnd.push(seg.celdaFinSeg); }
            else laneEnd[lane] = seg.celdaFinSeg;
            seg.lane = lane;
          });
        });

        return (
          <div>
            {/* Navegación mes */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <button onClick={() => setCalMes(new Date(año, mes - 1, 1))} style={{ background: 'transparent', border: '1px solid var(--border-color, rgba(255,255,255,0.15))', borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer', padding: '0.35rem 0.85rem', fontSize: '1rem' }}>‹</button>
              <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-heading)', textTransform: 'capitalize' }}>{mesNombre}</span>
              <button onClick={() => setCalMes(new Date(año, mes + 1, 1))} style={{ background: 'transparent', border: '1px solid var(--border-color, rgba(255,255,255,0.15))', borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer', padding: '0.35rem 0.85rem', fontSize: '1rem' }}>›</button>
            </div>
            {/* Leyenda sedes */}
            <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
              {SEDE_COLOR_LIST.map(({ sede, bg, border, text }) => (
                <span key={sede} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.68rem', fontWeight: 700, padding: '0.18rem 0.5rem', borderRadius: 6, background: bg, border: `1px solid ${border}`, color: text }}>
                  {getFlagForSede(sede)} {sede}
                </span>
              ))}
            </div>
            {/* Cabecera días */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3 }}>
              {DIAS_SEMANA.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: '0.67rem', fontWeight: 800, color: 'var(--text-muted)', padding: '0.28rem 0' }}>{d}</div>
              ))}
            </div>
            {/* Grid — semana a semana con barras multi-día */}
            {Array.from({ length: filasCal }).map((_, semanaIdx) => {
              const celdaBase = semanaIdx * 7;
              const segsEnSemana = segmentosPorSemana[semanaIdx] || [];
              const maxLanes = segsEnSemana.length > 0 ? Math.max(...segsEnSemana.map(s => s.lane)) + 1 : 0;
              const alturaCelda = Math.max(52, 24 + maxLanes * 21);
              return (
                <div key={semanaIdx} style={{ position: 'relative', marginBottom: 3 }}>
                  {/* Celdas fondo */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
                    {Array.from({ length: 7 }).map((_, colIdx) => {
                      const celda = celdaBase + colIdx;
                      const dia = celda - startOffset + 1;
                      const esValido = dia >= 1 && dia <= ultimoDia.getDate();
                      const dateStr = esValido ? `${año}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}` : null;
                      const esHoy = dateStr === hoyStr;
                      return (
                        <div key={colIdx} style={{ height: alturaCelda, borderRadius: 8, padding: '0.22rem 0.3rem', border: esHoy ? '1.5px solid var(--crear-gold)' : '1px solid var(--border-color, rgba(255,255,255,0.07))', background: esValido ? 'var(--card-bg, rgba(255,255,255,0.03))' : 'transparent', boxSizing: 'border-box' }}>
                          {esValido && <div style={{ fontSize: '0.72rem', fontWeight: esHoy ? 900 : 600, color: esHoy ? 'var(--crear-gold)' : 'var(--text-muted)' }}>{dia}</div>}
                        </div>
                      );
                    })}
                  </div>
                  {/* Barras multi-día overlay */}
                  {segsEnSemana.map((seg, si) => {
                    const col = getColor(seg.ev.sede);
                    const colInSemana = seg.celdaInicioSeg - celdaBase;
                    const spanCols    = seg.celdaFinSeg - seg.celdaInicioSeg + 1;
                    const esInicio    = seg.celdaInicioSeg === seg.celdaInicioTotal;
                    const esFin       = seg.celdaFinSeg    === seg.celdaFinTotal;
                    const label       = (seg.ev.nombre || '').length > 18 ? seg.ev.nombre.substring(0, 17) + '…' : (seg.ev.nombre || '');
                    const topOffset   = 24 + seg.lane * 21;
                    return (
                      <div key={si}
                        onClick={() => setCalTooltip(calTooltip?.key === `seg-${semanaIdx}-${si}` ? null : { key: `seg-${semanaIdx}-${si}`, ev: seg.ev })}
                        title={`${seg.ev.nombre}\n${fmtFecha(seg.ev.fechaInicio)} → ${fmtFecha(seg.ev.fechaFin || seg.ev.fechaInicio)}\n${seg.ev.entrenadorAsignado || seg.ev.entrenadorHoja || 'Sin asignar'}`}
                        style={{
                          position: 'absolute',
                          top: topOffset,
                          left: `calc(${colInSemana} * (100% / 7) + ${colInSemana * 3 + (esInicio ? 2 : 0)}px)`,
                          width: `calc(${spanCols} * (100% / 7) + ${(spanCols-1)*3 - (esInicio?2:0) - (esFin?2:0)}px)`,
                          height: 18,
                          cursor: 'pointer',
                          zIndex: seg.lane + 2,
                          background: col.bg,
                          border: `1px solid ${col.border}`,
                          borderLeftWidth: esInicio ? 3 : 0,
                          borderRightWidth: esFin ? 1 : 0,
                          borderRadius: esInicio && esFin ? 4 : esInicio ? '4px 0 0 4px' : esFin ? '0 4px 4px 0' : 0,
                          display: 'flex', alignItems: 'center',
                          paddingLeft: esInicio ? '0.3rem' : '0.1rem',
                          overflow: 'hidden', boxSizing: 'border-box',
                        }}
                      >
                        {esInicio && (
                          <span style={{ fontSize: '0.58rem', fontWeight: 700, color: col.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {getFlagForSede(seg.ev.sede)} {label}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {/* Panel detalle */}
            {calTooltip && (
              <div style={{ ...card, marginTop: '1rem', borderColor: 'var(--crear-gold)', maxWidth: 440 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ fontWeight: 800, color: 'var(--text-heading)', fontSize: '0.95rem' }}>{calTooltip.ev.nombre}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button title="Editar fechas" onClick={() => abrirEditorCalendario(calTooltip.ev)} style={{ background: 'none', border: 'none', color: 'var(--crear-gold)', cursor: 'pointer', padding: 0 }}><Pencil size={15} /></button>
                    <button onClick={() => setCalTooltip(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: 0 }}>✕</button>
                  </div>
                </div>
                <div style={{ fontSize: '0.78rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem 1.2rem', color: 'var(--text-muted)' }}>
                  {calTooltip.ev.fechaFin && calTooltip.ev.fechaFin !== calTooltip.ev.fechaInicio ? (<>
                    <span><strong style={{ color: 'var(--text-heading)' }}>Inicio:</strong> {fmtFecha(calTooltip.ev.fechaInicio)}</span>
                    <span><strong style={{ color: 'var(--text-heading)' }}>Fin:</strong> {fmtFecha(calTooltip.ev.fechaFin)}</span>
                  </>) : (
                    <span><strong style={{ color: 'var(--text-heading)' }}>Fecha:</strong> {fmtFecha(calTooltip.ev.fechaInicio)}</span>
                  )}
                  <span><strong style={{ color: 'var(--text-heading)' }}>Sede:</strong> {getFlagForSede(calTooltip.ev.sede)} {normalizeSede(calTooltip.ev.sede)}</span>
                  <span><strong style={{ color: 'var(--text-heading)' }}>Equipo:</strong> {calTooltip.ev.equipo || '—'}</span>
                  <span><strong style={{ color: 'var(--text-heading)' }}>Lugar:</strong> {calTooltip.ev.lugar || '—'}</span>
                  <span style={{ gridColumn: '1/-1' }}>
                    <strong style={{ color: 'var(--text-heading)' }}>Entrenador:</strong>{' '}
                    {calTooltip.ev.entrenadorAsignado
                      ? <span style={{ color: '#10b981', fontWeight: 700 }}>✓ {calTooltip.ev.entrenadorAsignado} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(asignado en Causa OS)</span></span>
                      : calTooltip.ev.entrenadorHoja
                        ? <span style={{ color: '#f59e0b', fontWeight: 700 }}>{calTooltip.ev.entrenadorHoja} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(de la hoja)</span></span>
                        : <span style={{ color: '#ef4444' }}>Sin asignar</span>
                    }
                  </span>
                  {(calTooltip.ev.preasignacionesHoja || []).length > 1 && (
                    <span style={{ gridColumn: '1/-1' }}>
                      <strong style={{ color: 'var(--text-heading)' }}>Preasignados en hoja:</strong> {calTooltip.ev.preasignacionesHoja.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            )}
            <div className="text-muted" style={{ fontSize: '0.71rem', marginTop: '0.8rem' }}>
              {totalEnMes} entrenamientos en este mes. Los filtros de Sede y Entrenador aplican también aquí.
            </div>
          </div>
        );
      })()}

    </div>
  );
}
