import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, Clock, Users, ChevronLeft, ChevronRight, 
  Plus, ArrowLeft, Filter, CheckCircle2, Sparkles, Shirt, X, 
  Layers, MapPin, Tag, AlertCircle, Info, Briefcase, Building, 
  UserCheck, Shield, FileText, CheckSquare, Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCycles } from '../context/CyclesContext';
import { useUI } from '../context/UIContext';
import { useNavigate } from 'react-router-dom';
import { OPERATIONAL_SEDES, normalizeSede } from '../data/usersData';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// ROLES OPERATIVOS DEL EQUIPO
const OPERATIONAL_ROLES = {
  todos: { id: 'todos', label: '🌐 Todo el Equipo', color: '#29abe2', desc: 'Vista unificada de Oficina, Gerencia y Coordinación' },
  oficina: { id: 'oficina', label: '🏢 Equipo de Oficina', color: '#0ea5e9', desc: 'Soporte Back-Office, Caja, Mesas de Registro y Atención' },
  gerente: { id: 'gerente', label: '👔 Gerentes de Sede', color: '#f59e0b', desc: 'Dirección Comercial, Presupuesto, Supervisión Nodus y Montaje' },
  coordinador: { id: 'coordinador', label: '🎯 Coordinadores (CC1Y2 & CMJ)', color: '#8b5cf6', desc: 'Montaje de Sala, Groundings, Salón y Enrolamiento' }
};

const BLOCK_TYPES = {
  Foco: { label: 'Foco / Administrativo', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.15)', border: 'rgba(14, 165, 233, 0.4)' },
  Reunion: { label: 'Reunión / Grounding', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)' },
  MesaCaja: { label: 'Mesa, Registro & Caja', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)' },
  Montaje: { label: 'Montaje & Sala', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.4)' },
  Deadline: { label: 'Deadline & Trigger Nodus', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)' }
};

// CRONOGRAMA MAESTRO POR ROL (HORARIOS REALES OFICINA, GERENTES Y COORDINADORES)
const MASTER_TEAM_SCHEDULES = [
  // LUNES
  {
    id: 'sch-l1',
    dayOfWeek: 1,
    roleCategory: 'gerente',
    title: 'Cierre de Caja FDS & Conciliación Bancaria Nodus',
    time: '08:30 - 12:00',
    type: 'Deadline',
    owner: 'Gerente de Sede',
    sede: 'Todas',
    notes: 'Conciliar depósitos bancarios vs. fichas físicas escaneadas en Nodus. Innegociable antes de las 12:00 PM.'
  },
  {
    id: 'sch-l2',
    dayOfWeek: 1,
    roleCategory: 'gerente',
    title: 'DEADLINE: Trigger Impecabilidad Contable (Escalamiento N2)',
    time: '12:00 - 12:30',
    type: 'Deadline',
    owner: 'Gerente de Sede',
    sede: 'Todas',
    notes: 'El sistema valida cierre contable al 100%. Si hay atraso se genera reporte disciplinario Nivel 2.'
  },
  {
    id: 'sch-l3',
    dayOfWeek: 1,
    roleCategory: 'oficina',
    title: 'Atención al Cliente, Facturación y Conciliación de Pagos',
    time: '09:00 - 13:30',
    type: 'Foco',
    owner: 'Equipo de Oficina (Soporte Back-Office)',
    sede: 'Todas',
    notes: 'Atención telefónica a participantes y graduados, emisión de comprobantes y validación de abonos.'
  },
  {
    id: 'sch-l4',
    dayOfWeek: 1,
    roleCategory: 'coordinador',
    title: 'Auditoría de Retención Inter-FDS y Reporte Semanal Nodus',
    time: '09:00 - 11:00',
    type: 'Foco',
    owner: 'Coordinador de Maestría (CMJ)',
    sede: 'Todas',
    notes: 'Evaluación de asistencia de mánagers y sentados por FDS en Nodus.'
  },
  {
    id: 'sch-l5',
    dayOfWeek: 1,
    roleCategory: 'oficina',
    title: 'Break de Almuerzo de Oficina',
    time: '13:30 - 14:30',
    type: 'Foco',
    owner: 'Equipo de Oficina',
    sede: 'Todas',
    notes: 'Desconexión activa del personal administrativo.'
  },
  {
    id: 'sch-l6',
    dayOfWeek: 1,
    roleCategory: 'oficina',
    title: 'Actualización de Expedientes & Llamadas de Soporte',
    time: '14:30 - 18:00',
    type: 'Foco',
    owner: 'Equipo de Oficina',
    sede: 'Todas',
    notes: 'Archivo digital de fichas de inscripción, regularización de cartas y llamadas de bienvenida.'
  },
  {
    id: 'sch-l7',
    dayOfWeek: 1,
    roleCategory: 'gerente',
    title: 'Auditoría de Rezagados & Metas del Nuevo Ciclo C1/C2',
    time: '15:00 - 18:30',
    type: 'Foco',
    owner: 'Gerente de Sede',
    sede: 'Todas',
    notes: 'Revisión con equipo comercial de deserciones y fijación de metas para la semana.'
  },

  // MARTES
  {
    id: 'sch-m1',
    dayOfWeek: 2,
    roleCategory: 'gerente',
    title: 'Auditoría de Salones, Contratos y Transporte del Entrenador',
    time: '09:00 - 13:00',
    type: 'Foco',
    owner: 'Gerente de Sede',
    sede: 'Todas',
    notes: 'Verificar contrato de salón, vuelos, hotel y honorarios programados del coach.'
  },
  {
    id: 'sch-m2',
    dayOfWeek: 2,
    roleCategory: 'coordinador',
    title: 'Alineación 1 a 1 con Mánagers: Avance de Evidencias FI',
    time: '10:00 - 13:00',
    type: 'Reunion',
    owner: 'Coordinador de Maestría (CMJ)',
    sede: 'Todas',
    notes: 'Llamadas de seguimiento y auditoría previa a la carga del miércoles.'
  },
  {
    id: 'sch-m3',
    dayOfWeek: 2,
    roleCategory: 'oficina',
    title: 'Jornada Continua de Soporte, Cobranzas y Atención Nodus',
    time: '09:00 - 18:00 (Receso 13:30-14:30)',
    type: 'Foco',
    owner: 'Equipo de Oficina',
    sede: 'Todas',
    notes: 'Gestión de cobros pendientes y atención en sede.'
  },
  {
    id: 'sch-m4',
    dayOfWeek: 2,
    roleCategory: 'gerente',
    title: 'Sincronización Comercial y Llamadas con Quantum Team (QT)',
    time: '15:00 - 18:00',
    type: 'Reunion',
    owner: 'Gerente de Sede & QT',
    sede: 'Todas',
    notes: 'Alineación de drills de llamadas y efectividad comercial mínima 60%.'
  },

  // MIÉRCOLES
  {
    id: 'sch-x1',
    dayOfWeek: 3,
    roleCategory: 'oficina',
    title: 'Preparación de Materiales de Registro, Boletos & Gafetes',
    time: '09:00 - 13:30',
    type: 'Foco',
    owner: 'Equipo de Oficina',
    sede: 'Todas',
    notes: 'Impresión en excelencia de tickets (Azul, Naranja, Rojo) y armado de carpetas de sala.'
  },
  {
    id: 'sch-x2',
    dayOfWeek: 3,
    roleCategory: 'coordinador',
    title: 'Auditoría & Carga en Nodus de Futuros Imposibles (FI)',
    time: '14:00 - 19:00',
    type: 'Deadline',
    owner: 'Coordinador de Maestría (CMJ)',
    sede: 'Todas',
    notes: 'Cargar la revisión individualizada del 100% de los mánagers antes de las 19:00 PM.'
  },
  {
    id: 'sch-x3',
    dayOfWeek: 3,
    roleCategory: 'gerente',
    title: 'DEADLINE DE ORO: Trigger Alerta de Deserción de Mánagers (19:00 PM)',
    time: '19:00 - 19:15',
    type: 'Deadline',
    owner: 'Gerente de Sede & CMJ',
    sede: 'Todas',
    notes: 'El sistema valida que el campo de revisión de FI no esté vacío. Si falta, emite Alerta Roja a Gerencia.'
  },
  {
    id: 'sch-x4',
    dayOfWeek: 3,
    roleCategory: 'coordinador',
    title: 'Grounding Virtual de Maestría con Mánagers y Capitán',
    time: '19:00 - 20:00',
    type: 'Reunion',
    owner: 'Coordinador de Maestría (CMJ)',
    sede: 'Todas',
    notes: 'Alineación de fisionomía, acuerdos y compromisos para el fin de semana.'
  },
  {
    id: 'sch-x5',
    dayOfWeek: 3,
    roleCategory: 'coordinador',
    title: 'Grounding Virtual Obligatorio de Aliados C2 (Teams/Zoom)',
    time: '20:00 - 21:00 (Hora Exacta)',
    type: 'Reunion',
    owner: 'Coordinador C1/C2 (CC1Y2) & Capitán',
    sede: 'Todas',
    notes: 'Duración exacta 60 min. Asignación de parejas Sistema Buddy. Inasistencia = suspensión automática.'
  },

  // JUEVES
  {
    id: 'sch-j1',
    dayOfWeek: 4,
    roleCategory: 'oficina',
    title: 'Despacho de Insumos, Papelería y Baúles hacia Salón',
    time: '09:00 - 13:00',
    type: 'Foco',
    owner: 'Equipo de Oficina',
    sede: 'Todas',
    notes: 'Alistamiento de baúl de Noche de Confianza, sellos, tickets, POS y cargadores.'
  },
  {
    id: 'sch-j2',
    dayOfWeek: 4,
    roleCategory: 'gerente',
    title: 'Supervisión Presencial de Montaje, Audio y Altura Mínima',
    time: '14:30 - 20:30',
    type: 'Montaje',
    owner: 'Gerente de Sede',
    sede: 'Todas',
    notes: 'Inspeccionar altura de techo mínimo 4.5m (seguridad Caída de Confianza), audio y sillas en herradura.'
  },
  {
    id: 'sch-j3',
    dayOfWeek: 4,
    roleCategory: 'coordinador',
    title: 'Llegada a Sede & Montaje Físico de Sala (Basura Cero)',
    time: '15:00 - 18:00',
    type: 'Montaje',
    owner: 'Coordinador C1/C2 (CC1Y2) & Soporte',
    sede: 'Todas',
    notes: 'Montaje en herradura, pruebas de micrófonos inalámbricos y climatización del salón.'
  },
  {
    id: 'sch-j4',
    dayOfWeek: 4,
    roleCategory: 'oficina',
    title: 'Llegada de Oficina a Sede: Enlace de Terminales Nodus y Caja',
    time: '15:00 - 20:00',
    type: 'MesaCaja',
    owner: 'Equipo de Oficina (Soporte Técnico)',
    sede: 'Todas',
    notes: 'Conexión de red, terminales POS, impresoras térmicas y fondo fijo de caja chica.'
  },
  {
    id: 'sch-j5',
    dayOfWeek: 4,
    roleCategory: 'coordinador',
    title: 'Grounding con Mánagers y Auditoría Física de FI',
    time: '16:30 - 18:00',
    type: 'Reunion',
    owner: 'Coordinador de Maestría (CMJ)',
    sede: 'Todas',
    notes: 'Auditoría física de evidencias 100% presencial con los participantes que se gradúan.'
  },
  {
    id: 'sch-j6',
    dayOfWeek: 4,
    roleCategory: 'coordinador',
    title: 'Grounding Presencial de Aliados C1 (Puertas Cerradas en Punto)',
    time: '18:00 - 20:00 (Hora Exacta)',
    type: 'Reunion',
    owner: 'CC1Y2, Capitán & CMJ',
    sede: 'Todas',
    notes: 'Cero Tolerancia. Asignación de roles sin repetición del ciclo anterior. Publicación de parejas Sombra.'
  },
  {
    id: 'sch-j7',
    dayOfWeek: 4,
    roleCategory: 'oficina',
    title: 'Cierre de Sede Bajo Llave en Excelencia',
    time: '20:00 - Cierre',
    type: 'Foco',
    owner: 'Equipo de Oficina & Coordinación',
    sede: 'Todas',
    notes: 'Salón ordenado, inventario resguardado y retiro temprano del equipo para descanso.'
  },

  // VIERNES
  {
    id: 'sch-v1',
    dayOfWeek: 5,
    roleCategory: 'oficina',
    title: 'Llegada de Oficina a Sede (30 min antes): Encendido de Nodus y Caja',
    time: '07:45 - 08:30',
    type: 'MesaCaja',
    owner: 'Equipo de Oficina',
    sede: 'Todas',
    notes: 'Encender terminales de Nodus, alistar gavetas de caja, gafetes y papelería legal.'
  },
  {
    id: 'sch-v2',
    dayOfWeek: 5,
    roleCategory: 'coordinador',
    title: 'Llegada de Coordinación & Grounding de Aliados C1',
    time: '08:00 - 09:00',
    type: 'Reunion',
    owner: 'Coordinador C1/C2 (CC1Y2) & Capitán',
    sede: 'Todas',
    notes: 'Alineación de staff en sala, revisión de vestimenta formal negra y ensayo de drills.'
  },
  {
    id: 'sch-v3',
    dayOfWeek: 5,
    roleCategory: 'oficina',
    title: 'Apertura de Mesas de Registro: Escaneo QR Nodus y Cartas de Exoneración',
    time: '09:00 - 11:30',
    type: 'MesaCaja',
    owner: 'Equipo de Oficina & Mesa de Registro',
    sede: 'Todas',
    notes: 'Escaneo digital QR obligatorio, firma de carta de exoneración, entrega de Ticket Azul y custodia de celulares.'
  },
  {
    id: 'sch-v4',
    dayOfWeek: 5,
    roleCategory: 'gerente',
    title: 'Auditoría del Reporte Definitivo de Asistencia (Meta 95%)',
    time: '11:30 - 12:00',
    type: 'Deadline',
    owner: 'Gerente de Sede & CC1Y2',
    sede: 'Todas',
    notes: 'Envío de asistencia oficial a Contabilidad y Gerencia. Cierre absoluto de puertas para C1.'
  },
  {
    id: 'sch-v5',
    dayOfWeek: 5,
    roleCategory: 'oficina',
    title: 'Carga de Grupos de Creación en Plataforma Nodus',
    time: '13:30 - 14:00',
    type: 'Foco',
    owner: 'Equipo de Oficina / CC1Y2',
    sede: 'Todas',
    notes: 'Digitar los grupos formados en sala dentro del sistema para trazabilidad del ciclo.'
  },
  {
    id: 'sch-v6',
    dayOfWeek: 5,
    roleCategory: 'gerente',
    title: 'DEADLINE TRIGGER: Palabra Rota C2 (14:01 PM - Bloqueo de Acceso QR)',
    time: '14:01 - 14:30',
    type: 'Deadline',
    owner: 'Gerente de Sede',
    sede: 'Todas',
    notes: 'Cruce automático de declarantes del jueves vs. caja. Bloqueo de QR a no pagantes de C2.'
  },
  {
    id: 'sch-v7',
    dayOfWeek: 5,
    roleCategory: 'oficina',
    title: 'Break de Almuerzo & Llamadas de Soporte y Recuperación',
    time: '15:00 - 17:00',
    type: 'Foco',
    owner: 'Equipo de Oficina',
    sede: 'Todas',
    notes: 'Reimpresión de gafetes y llamadas de rescate a participantes inasistentes.'
  },
  {
    id: 'sch-v8',
    dayOfWeek: 5,
    roleCategory: 'coordinador',
    title: 'Inspección de Baúl, Grounding Entrenador & Apertura Maestría (MJ)',
    time: '15:30 - 18:00',
    type: 'Montaje',
    owner: 'Coordinador de Maestría (CMJ)',
    sede: 'Todas',
    notes: 'Grounding privado Coach/CMJ, registro QR en pasillo y apertura de sala a las 18:00 PM.'
  },
  {
    id: 'sch-v9',
    dayOfWeek: 5,
    roleCategory: 'oficina',
    title: 'Soporte al Montaje del Baúl de Noche de Confianza',
    time: '21:30 - 22:30',
    type: 'MesaCaja',
    owner: 'Equipo de Oficina & Staff Graduado',
    sede: 'Todas',
    notes: 'Preparación de tinajas con agua tibia con resistencias eléctricas, cremas corporales y frutas.'
  },
  {
    id: 'sch-v10',
    dayOfWeek: 5,
    roleCategory: 'coordinador',
    title: 'Ejecución de la Noche de Confianza (Viernes C1)',
    time: '22:00 - 23:30',
    type: 'Montaje',
    owner: 'CC1Y2, CMJ & Capitán',
    sede: 'Todas',
    notes: 'Contenedor de alta vibración y gratitud con graduados de Maestría. Vestimenta: Negro formal.'
  },
  {
    id: 'sch-v11',
    dayOfWeek: 5,
    roleCategory: 'oficina',
    title: 'Cierre de Jornada y Reporte Nocturno de Caja y Asistencia en Nodus',
    time: '23:30 - Cierre',
    type: 'Deadline',
    owner: 'Equipo de Oficina & CC1Y2',
    sede: 'Todas',
    notes: 'Resguardo de insumos, conciliación de caja del día y cierre de sede.'
  },

  // SÁBADO
  {
    id: 'sch-s1',
    dayOfWeek: 6,
    roleCategory: 'oficina',
    title: 'Llegada de Oficina y Apertura de Mesas: Entrega de Ticket Naranja',
    time: '08:00 - 11:00',
    type: 'MesaCaja',
    owner: 'Equipo de Oficina',
    sede: 'Todas',
    notes: 'Control en puerta, entrega de Ticket Naranja. Cierre absoluto a las 11:00 AM.'
  },
  {
    id: 'sch-s2',
    dayOfWeek: 6,
    roleCategory: 'coordinador',
    title: 'Llegada de Coordinación, Grounding y Revisión de Vestimenta',
    time: '07:45 - 08:30',
    type: 'Reunion',
    owner: 'Coordinador C1/C2 (CC1Y2)',
    sede: 'Todas',
    notes: 'Ajuste de fisionomía. Polo negro y jean negro. Nota: Coach usa zapatillas deportivas negras.'
  },
  {
    id: 'sch-s3',
    dayOfWeek: 6,
    roleCategory: 'coordinador',
    title: 'Apertura de Mesas y Jornada de Sala de Maestría (FDS 1, 2, 3)',
    time: '08:00 - 12:00',
    type: 'Montaje',
    owner: 'Coordinador de Maestría (CMJ)',
    sede: 'Todas',
    notes: 'Reingreso 09:00 AM, reporte de asistencia 11:00 AM y control de dinámica de visión.'
  },
  {
    id: 'sch-s4',
    dayOfWeek: 6,
    roleCategory: 'gerente',
    title: 'Monitoreo de Indicadores y Supervisión de Dinámicas de Seguridad',
    time: '09:00 - 14:00',
    type: 'Foco',
    owner: 'Gerente de Sede',
    sede: 'Todas',
    notes: 'Supervisar protocolos de seguridad y reportes intermedios de retención.'
  },
  {
    id: 'sch-s5',
    dayOfWeek: 6,
    roleCategory: 'coordinador',
    title: 'Montaje de Salón Alterno & Protocolo de Seguridad: Caída de Confianza',
    time: '14:00 - 18:00',
    type: 'Montaje',
    owner: 'CC1Y2 & Gerente',
    sede: 'Todas',
    notes: 'Escalera certificada de 2m, colchoneta de alta densidad y mínimo 4 apoyos certificados para cuna de brazos.'
  },
  {
    id: 'sch-s6',
    dayOfWeek: 6,
    roleCategory: 'coordinador',
    title: 'Jornada Vespertina de Maestría & Reporte de Abonos en Nodus',
    time: '16:00 - 21:00',
    type: 'Foco',
    owner: 'Coordinador de Maestría (CMJ)',
    sede: 'Todas',
    notes: 'Seguimiento de abonos de ciclo y reporte de cierre a las 21:00 PM.'
  },
  {
    id: 'sch-s7',
    dayOfWeek: 6,
    roleCategory: 'coordinador',
    title: 'Grounding Nocturno: Conteo de Declarantes de Intención',
    time: '22:00 - 22:30',
    type: 'Reunion',
    owner: 'CC1Y2 & Capitán',
    sede: 'Todas',
    notes: 'Alineación de terminales POS para la cobranza del domingo y reporte final a Gerencia.'
  },

  // DOMINGO
  {
    id: 'sch-d1',
    dayOfWeek: 0,
    roleCategory: 'oficina',
    title: 'Llegada de Oficina y Montaje de 3 Mesas Operativas',
    time: '08:00 - 09:00',
    type: 'MesaCaja',
    owner: 'Equipo de Oficina & CC1Y2',
    sede: 'Todas',
    notes: 'Montar Mesa de Registro C1, Mesa de Creación (liderada por CMJ) y Mesa de Enrolamiento C2.'
  },
  {
    id: 'sch-d2',
    dayOfWeek: 0,
    roleCategory: 'gerente',
    title: 'Liderazgo & Supervisión de Mesas de Enrolamiento (Metas 50% y 70%)',
    time: '09:00 - 15:00',
    type: 'Deadline',
    owner: 'Gerente de Sede',
    sede: 'Todas',
    notes: 'Monitorear conversión en vivo C1➔C2 (meta 50%) y C2➔MJ (meta 70%). Firmar convenios de pago excepcionales.'
  },
  {
    id: 'sch-d3',
    dayOfWeek: 0,
    roleCategory: 'coordinador',
    title: 'Control Directo de la Mesa de Enrolamiento C2 en Nodus',
    time: '09:00 - 15:00',
    type: 'MesaCaja',
    owner: 'Coordinador C1/C2 (CC1Y2)',
    sede: 'Todas',
    notes: 'Prioridad absoluta: cobro transaccional en Nodus (TRANSF, TC, LINK, EFECTIVO, USDT, PAYPHONE) y entrega de Ticket Rojo.'
  },
  {
    id: 'sch-d4',
    dayOfWeek: 0,
    roleCategory: 'coordinador',
    title: 'Charla del Avión en Salón & Entrega de Ticket Rojo',
    time: '10:30 - 12:00',
    type: 'Montaje',
    owner: 'CC1Y2 & Staff de Sala',
    sede: 'Todas',
    notes: 'Emisión de tickets rojos oficiales para el Capítulo Dos.'
  },
  {
    id: 'sch-d5',
    dayOfWeek: 0,
    roleCategory: 'coordinador',
    title: 'Captura y Registro en Nodus de Aliados Declarados para C2',
    time: '15:30 - 16:30',
    type: 'Foco',
    owner: 'Coordinador C1/C2 (CC1Y2)',
    sede: 'Todas',
    notes: 'Ingreso inmediato al sistema de los nuevos aliados para el siguiente ciclo avanzado.'
  },
  {
    id: 'sch-d6',
    dayOfWeek: 0,
    roleCategory: 'coordinador',
    title: 'Ceremonial del Pase de Antorcha (Maestría ➔ C1)',
    time: '18:00 - 19:30',
    type: 'Montaje',
    owner: 'Coordinador de Maestría (CMJ) & Coach Paul Sosa',
    sede: 'Todas',
    notes: 'Ingreso ceremonial de la Maestría con velas, estandartes y antorcha a la sala de graduación de C1.'
  },
  {
    id: 'sch-d7',
    dayOfWeek: 0,
    roleCategory: 'oficina',
    title: 'CIERRE CONTABLE OBLIGATORIO: Cierre de POS y Entrega Física',
    time: '21:00 - 22:00',
    type: 'Deadline',
    owner: 'Equipo de Oficina, CC1Y2 & Gerente',
    sede: 'Todas',
    notes: 'Cierre de terminales POS. Escanear al 100% las fichas físicas firmadas y enviar PDF consolidado a Elizabeth Escobar.'
  }
];

export default function TeamCalendar() {
  const { currentUser } = useAuth();
  const { events } = useCycles();
  const { showToast } = useUI();
  const navigate = useNavigate();

  // Filtro de Rol: 'todos', 'oficina', 'gerente', 'coordinador'
  const [selectedRole, setSelectedRole] = useState('todos');
  const [activeTab, setActiveTab] = useState('calendario'); // 'calendario' | 'turnos_rol' | 'horarios_sala'
  const [selectedType, setSelectedType] = useState('todos');
  const [selectedSede, setSelectedSede] = useState(() => normalizeSede(currentUser?.sede) || 'Todas');
  
  const today = useMemo(() => new Date(), []);
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  // Bloques personalizados guardados localmente combinados con la matriz maestra
  const [customBlocks, setCustomBlocks] = useState(() => {
    try {
      const saved = localStorage.getItem('cpsl_timeboxing_blocks_v2');
      return saved ? JSON.parse(saved) : MASTER_TEAM_SCHEDULES;
    } catch (e) {
      return MASTER_TEAM_SCHEDULES;
    }
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [newBlock, setNewBlock] = useState({
    title: '',
    time: '09:00 - 11:00',
    type: 'Foco',
    roleCategory: 'oficina',
    owner: currentUser?.displayName || currentUser?.name || 'Equipo de Oficina',
    sede: currentUser?.sede || 'Lima',
    notes: ''
  });

  const handleSaveBlock = (e) => {
    e.preventDefault();
    if (!newBlock.title.trim()) {
      showToast?.('Ingresa un título para el bloque', 'error');
      return;
    }
    const block = {
      ...newBlock,
      id: `sch-${Date.now()}`,
      dayOfWeek: selectedDate.getDay(),
      specificDate: selectedDate.toISOString().slice(0, 10)
    };
    const updated = [block, ...customBlocks];
    setCustomBlocks(updated);
    try {
      localStorage.setItem('cpsl_timeboxing_blocks_v2', JSON.stringify(updated));
    } catch (err) {}
    setShowAddModal(false);
    setNewBlock({
      title: '',
      time: '09:00 - 11:00',
      type: 'Foco',
      roleCategory: 'oficina',
      owner: currentUser?.displayName || currentUser?.name || 'Equipo',
      sede: currentUser?.sede || 'Lima',
      notes: ''
    });
    showToast?.('¡Bloque operativo agendado correctamente!', 'success');
  };

  const handlePrevMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleGoToday = () => {
    const now = new Date();
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now);
  };

  // Construcción de la cuadrícula de 7 días
  const calendarCells = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 Dom, 1 Lun
    const mondayFirstIndex = (firstDayIndex + 6) % 7;

    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells = [];

    // Días del mes previo
    for (let i = mondayFirstIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const date = new Date(year, month - 1, dayNum);
      cells.push({
        date,
        dayNum,
        isCurrentMonth: false,
        isToday: date.toDateString() === today.toDateString()
      });
    }

    // Días del mes actual
    for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
      const date = new Date(year, month, dayNum);
      cells.push({
        date,
        dayNum,
        isCurrentMonth: true,
        isToday: date.toDateString() === today.toDateString()
      });
    }

    // Completar última semana
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const date = new Date(year, month + 1, dayNum);
      cells.push({
        date,
        dayNum,
        isCurrentMonth: false,
        isToday: date.toDateString() === today.toDateString()
      });
    }

    return cells;
  }, [viewDate, today]);

  // Eventos de Cycles en el día seleccionado
  const selectedDayEvents = useMemo(() => {
    if (!events || events.length === 0) return [];
    const dateStr = selectedDate.toISOString().slice(0, 10);
    return events.filter(e => {
      const evStart = (e.fechaInicio || e.startDate || e.date || '').slice(0, 10);
      const evEnd = (e.fechaFin || e.endDate || evStart).slice(0, 10);
      return dateStr >= evStart && dateStr <= evEnd;
    });
  }, [events, selectedDate]);

  // Bloques del día seleccionado filtrados por ROL, SEDE y TIPO
  const selectedDayBlocks = useMemo(() => {
    const dayOfWeek = selectedDate.getDay();
    const dateStr = selectedDate.toISOString().slice(0, 10);

    return customBlocks.filter(b => {
      // Filtro por Rol
      if (selectedRole !== 'todos' && b.roleCategory && b.roleCategory !== selectedRole) {
        return false;
      }
      // Filtro por Sede
      if (selectedSede !== 'Todas' && b.sede !== 'Todas' && b.sede !== selectedSede) {
        return false;
      }
      // Filtro por Tipo de Bloque
      if (selectedType !== 'todos' && b.type !== selectedType) {
        return false;
      }
      // Fecha específica o día recurrente
      if (b.specificDate) {
        return b.specificDate === dateStr;
      }
      return b.dayOfWeek === dayOfWeek;
    });
  }, [customBlocks, selectedDate, selectedRole, selectedType, selectedSede]);

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem 2rem 5rem', color: 'var(--text-main)' }}>
      
      {/* HEADER SUPERIOR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.8rem' }}>
        <div>
          <button 
            onClick={() => navigate('/home')}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.4rem', 
              background: 'none', 
              border: 'none', 
              color: 'var(--crear-cyan)', 
              cursor: 'pointer', 
              fontSize: '0.85rem', 
              fontWeight: 600,
              padding: 0,
              marginBottom: '0.6rem'
            }}
          >
            <ArrowLeft size={16} /> Volver a Causa OS
          </button>
          
          <h1 style={{ 
            fontSize: '2.1rem', 
            fontWeight: 900, 
            letterSpacing: '-1px', 
            margin: 0, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.8rem',
            color: 'var(--text-heading)' 
          }}>
            <CalendarIcon size={32} color="var(--crear-cyan)" />
            Horarios & Agenda Operativa del Equipo
          </h1>
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.92rem', color: 'var(--text-muted)' }}>
            <strong>CREAR PODER SIN LÍMITES</strong> • Jornadas, turnos y deadlines para <strong>Equipo de Oficina, Gerentes de Sede y Coordinadores</strong>.
          </p>
        </div>

        {/* ACCIONES SUPERIORES */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setShowAddModal(true)} 
            className="btn-primary"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              padding: '0.6rem 1.2rem', 
              fontSize: '0.9rem', 
              fontWeight: 700,
              background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
              boxShadow: '0 4px 15px rgba(14, 165, 233, 0.3)',
              borderRadius: '10px'
            }}
          >
            <Plus size={18} /> Agendar Turno / Bloque
          </button>

          <button 
            onClick={() => navigate('/calendario-mj')}
            className="btn-secondary"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.4rem', 
              padding: '0.6rem 1.1rem', 
              fontSize: '0.9rem', 
              fontWeight: 600,
              borderRadius: '10px',
              color: 'var(--crear-gold)'
            }}
          >
            <Sparkles size={16} /> Calendario Maestría (MJ)
          </button>
        </div>
      </div>

      {/* SELECTOR DE ROL DESTACADO (OFICINA, GERENTES, COORDINADORES) */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '1rem 1.2rem', 
          borderRadius: '14px', 
          marginBottom: '1.5rem', 
          border: '1px solid rgba(41, 171, 226, 0.25)',
          background: 'rgba(255, 255, 255, 0.02)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--crear-cyan)' }}>
              Filtro Activo por Rol Operativo:
            </span>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {OPERATIONAL_ROLES[selectedRole]?.desc}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {Object.entries(OPERATIONAL_ROLES).map(([key, r]) => {
              const isSelected = selectedRole === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedRole(key)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '10px',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: isSelected ? `2px solid ${r.color}` : '1px solid rgba(255,255,255,0.1)',
                    background: isSelected ? `${r.color}25` : 'rgba(255,255,255,0.03)',
                    color: isSelected ? '#fff' : 'var(--text-muted)',
                    boxShadow: isSelected ? `0 0 15px ${r.color}30` : 'none'
                  }}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* PESTAÑAS PRINCIPALES */}
      <div style={{ display: 'flex', gap: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.8rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('calendario')}
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: '10px',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
            border: activeTab === 'calendario' ? '1px solid var(--crear-cyan)' : '1px solid rgba(255,255,255,0.08)',
            background: activeTab === 'calendario' ? 'rgba(41, 171, 226, 0.15)' : 'rgba(255,255,255,0.03)',
            color: activeTab === 'calendario' ? 'var(--crear-cyan)' : 'var(--text-muted)'
          }}
        >
          🗓️ Calendario Interactivo & Agenda Diaria
        </button>

        <button
          onClick={() => setActiveTab('turnos_rol')}
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: '10px',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
            border: activeTab === 'turnos_rol' ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)',
            background: activeTab === 'turnos_rol' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.03)',
            color: activeTab === 'turnos_rol' ? '#fbbf24' : 'var(--text-muted)'
          }}
        >
          📋 Matriz Semanal de Horarios (Oficina, Gerencia & Coordinación)
        </button>

        <button
          onClick={() => setActiveTab('horarios_sala')}
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: '10px',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
            border: activeTab === 'horarios_sala' ? '1px solid #8b5cf6' : '1px solid rgba(255,255,255,0.08)',
            background: activeTab === 'horarios_sala' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.03)',
            color: activeTab === 'horarios_sala' ? '#c4b5fd' : 'var(--text-muted)'
          }}
        >
          ⏰ Horarios Oficiales de Sala (C1 / C2 / MJ & Vestimenta)
        </button>
      </div>

      {/* TAB 1: CALENDARIO INTERACTIVO & TIMELINE */}
      {activeTab === 'calendario' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 460px) 1fr', gap: '2rem', alignItems: 'start' }}>
          
          {/* COLUMNA IZQUIERDA: CALENDARIO MENSUAL */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-strong)' }}>
            
            {/* CABECERA DEL MES CON CONTROLES */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                  {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Selecciona un día para ver turnos y tareas
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button 
                  onClick={handleGoToday} 
                  className="btn-secondary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: '6px' }}
                >
                  Hoy
                </button>
                <button 
                  onClick={handlePrevMonth}
                  className="btn-secondary"
                  style={{ padding: '0.4rem', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Mes anterior"
                >
                  <ChevronLeft size={16} />
                </button>
                <button 
                  onClick={handleNextMonth}
                  className="btn-secondary"
                  style={{ padding: '0.4rem', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Mes siguiente"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* DÍAS DE LA SEMANA */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              {WEEKDAYS.map((w, idx) => (
                <div key={idx} style={{ padding: '0.4rem 0', color: idx >= 3 ? 'var(--crear-cyan)' : 'inherit' }}>
                  {w}
                </div>
              ))}
            </div>

            {/* GRILLA DE DÍAS (7 COLUMNAS) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center' }}>
              {calendarCells.map((cell, idx) => {
                const isSelected = cell.date.toDateString() === selectedDate.toDateString();
                const isEventDay = cell.date.getDay() >= 4 || cell.date.getDay() === 0; // Jueves a Domingo

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(cell.date)}
                    style={{
                      aspectRatio: '1',
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '10px',
                      border: isSelected 
                        ? '2px solid var(--crear-cyan)' 
                        : (cell.isToday ? '1px dashed var(--crear-gold)' : '1px solid rgba(255,255,255,0.04)'),
                      background: isSelected 
                        ? 'rgba(41, 171, 226, 0.25)' 
                        : (cell.isToday ? 'rgba(255, 193, 7, 0.1)' : (cell.isCurrentMonth ? (isEventDay ? 'rgba(139, 92, 246, 0.05)' : 'rgba(255,255,255,0.02)') : 'transparent')),
                      color: isSelected 
                        ? '#fff' 
                        : (cell.isToday ? 'var(--crear-gold)' : (cell.isCurrentMonth ? (isEventDay ? '#c4b5fd' : 'var(--text-main)') : 'rgba(255,255,255,0.2)')),
                      fontWeight: isSelected || cell.isToday ? 800 : 500,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      position: 'relative'
                    }}
                  >
                    <span>{cell.dayNum}</span>
                    {cell.isToday && (
                      <span style={{ position: 'absolute', bottom: '3px', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--crear-gold)' }}></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* FILTROS ADICIONALES */}
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.6rem', textTransform: 'uppercase' }}>
                Filtrar por Sede y Tipo de Tarea:
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
                <select
                  value={selectedSede}
                  onChange={(e) => setSelectedSede(e.target.value)}
                  style={{
                    padding: '0.35rem 0.6rem',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    background: 'rgba(255,255,255,0.06)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-strong)',
                    outline: 'none'
                  }}
                >
                  <option value="Todas">🌐 Todas las Sedes</option>
                  {OPERATIONAL_SEDES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  style={{
                    padding: '0.35rem 0.6rem',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    background: 'rgba(255,255,255,0.06)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-strong)',
                    outline: 'none'
                  }}
                >
                  <option value="todos">🎯 Todos los Tipos</option>
                  {Object.entries(BLOCK_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>

              {/* Botón rápido a Matriz de Turnos */}
              <button
                onClick={() => setActiveTab('turnos_rol')}
                style={{
                  width: '100%',
                  padding: '0.55rem',
                  borderRadius: '8px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  color: '#fbbf24',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem'
                }}
              >
                <Briefcase size={14} /> Ver Matriz Completa de Turnos del Equipo
              </button>
            </div>

          </div>

          {/* COLUMNA DERECHA: TIMELINE DE TURNOS DEL DÍA SELECCIONADO */}
          <div className="glass-panel" style={{ padding: '1.8rem', borderRadius: '16px', border: '1px solid var(--border-strong)' }}>
            
            {/* ENCABEZADO DEL DÍA */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.8rem' }}>
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--crear-cyan)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {WEEKDAYS[(selectedDate.getDay() + 6) % 7]}, {selectedDate.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                  Agenda y Turnos: {OPERATIONAL_ROLES[selectedRole]?.label}
                </h2>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-secondary"
                style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem', fontWeight: 700, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Plus size={15} /> Añadir Bloque
              </button>
            </div>

            {/* EVENTOS OFICIALES DE SALA */}
            {selectedDayEvents.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--crear-gold)', textTransform: 'uppercase', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Sparkles size={14} /> Eventos Oficiales de Ciclo (Firestore)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {selectedDayEvents.map((ev, i) => (
                    <div 
                      key={i} 
                      style={{ 
                        padding: '0.8rem 1rem', 
                        borderRadius: '10px', 
                        background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.1), rgba(245, 158, 11, 0.05))',
                        border: '1px solid rgba(255, 193, 7, 0.3)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <strong style={{ color: 'var(--crear-gold)', fontSize: '0.95rem' }}>{ev.nombre || ev.name}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Sede: {ev.sede || ev.sedeTag || 'Todas'} {ev.trainer ? `• Entrenador: ${ev.trainer}` : ''}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(255, 193, 7, 0.2)', color: 'var(--crear-gold)', fontWeight: 'bold' }}>
                        Oficial
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LISTA DE BLOQUES DEL DÍA */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.8rem' }}>
                Turnos, Responsabilidades y Deadlines ({selectedDayBlocks.length})
              </div>

              {selectedDayBlocks.length === 0 ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <Clock size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.8rem', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                    No hay bloques programados para este rol en este día.
                  </p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="btn-primary"
                    style={{ marginTop: '1rem', padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                  >
                    + Agendar un Turno / Bloque
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {selectedDayBlocks.map((block) => {
                    const typeCfg = BLOCK_TYPES[block.type] || BLOCK_TYPES.Foco;
                    const roleCfg = OPERATIONAL_ROLES[block.roleCategory] || OPERATIONAL_ROLES.oficina;

                    return (
                      <div 
                        key={block.id}
                        className="glass-panel"
                        style={{
                          padding: '1.1rem 1.3rem',
                          borderRadius: '12px',
                          borderLeft: `5px solid ${typeCfg.color}`,
                          background: 'rgba(255,255,255,0.02)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                          transition: 'transform 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                          <div>
                            <span 
                              style={{ 
                                display: 'inline-block',
                                fontSize: '0.68rem', 
                                padding: '1px 7px', 
                                borderRadius: '10px', 
                                background: `${roleCfg.color}25`, 
                                color: roleCfg.color,
                                border: `1px solid ${roleCfg.color}50`,
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                marginBottom: '0.3rem'
                              }}
                            >
                              {roleCfg.label}
                            </span>
                            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                              {block.title}
                            </h4>
                          </div>

                          <span 
                            style={{ 
                              fontSize: '0.72rem', 
                              padding: '2px 8px', 
                              borderRadius: '12px', 
                              background: typeCfg.bg, 
                              color: typeCfg.color, 
                              border: `1px solid ${typeCfg.border}`,
                              fontWeight: 700,
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {typeCfg.label}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', fontSize: '0.82rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--crear-cyan)', fontWeight: 700 }}>
                            <Clock size={14} /> {block.time}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Users size={14} /> {block.owner}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <MapPin size={14} /> {block.sede}
                          </div>
                        </div>

                        {block.notes && (
                          <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.75)', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '0.4rem', marginTop: '0.2rem', lineHeight: '1.4' }}>
                            {block.notes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: MATRIZ SEMANAL DE HORARIOS (OFICINA, GERENCIA, COORDINACIÓN) */}
      {activeTab === 'turnos_rol' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="glass-panel" style={{ padding: '1.8rem', borderRadius: '16px', borderLeft: '5px solid #f59e0b' }}>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Briefcase size={26} color="#f59e0b" />
              Estructura Semanal de Horarios y Turnos Operativos
            </h2>
            <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-muted)' }}>
              Protocolo innegociable de turnos, jornadas y deadlines para el <strong>Equipo de Oficina</strong>, los <strong>Gerentes de Sede</strong> y los <strong>Coordinadores (CC1Y2 y CMJ)</strong>.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
            
            {/* COLUMNA 1: EQUIPO DE OFICINA */}
            <div className="glass-panel" style={{ padding: '1.6rem', borderRadius: '14px', borderTop: '4px solid #0ea5e9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8' }}>
                    🏢 Equipo de Oficina
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Soporte Back-Office, Caja y Mesas</span>
                </div>
                <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(14, 165, 233, 0.2)', color: '#38bdf8', fontWeight: 'bold' }}>
                  Nivel 9
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
                <div style={{ padding: '0.8rem', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <strong style={{ color: 'var(--crear-cyan)' }}>Lunes a Jueves (Semana Regular):</strong>
                  <div style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)' }}>
                    • <strong>09:00 AM - 13:30 PM:</strong> Turno Mañana. Atención telefónica/presencial, facturación y conciliación bancaria de cobros Nodus.<br/>
                    • <strong>13:30 PM - 14:30 PM:</strong> Receso de Almuerzo.<br/>
                    • <strong>14:30 PM - 18:00 PM:</strong> Turno Tarde. Carga de fichas de inscripción, digitalización y llamadas a confirmados.
                  </div>
                </div>

                <div style={{ padding: '0.8rem', borderRadius: '8px', background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.25)' }}>
                  <strong style={{ color: '#38bdf8' }}>Jueves de Montaje:</strong>
                  <div style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)' }}>
                    • <strong>15:00 PM - 20:00 PM:</strong> Llegada de oficina y soporte técnico. Enlace de terminales Nodus, conexión de red, validación de caja y cierre de sede con llave.
                  </div>
                </div>

                <div style={{ padding: '0.8rem', borderRadius: '8px', background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.25)' }}>
                  <strong style={{ color: '#38bdf8' }}>Viernes de Apertura y C1:</strong>
                  <div style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)' }}>
                    • <strong>07:45 AM:</strong> Llegada de oficina (30 min antes). Apertura de mesas de registro y caja.<br/>
                    • <strong>09:00 AM - 11:30 AM:</strong> Escaneo QR digital Nodus y firmas de Cartas de Exoneración.<br/>
                    • <strong>15:00 PM - 17:00 PM:</strong> Break de comida y llamadas de rescate.<br/>
                    • <strong>21:30 PM - 23:30 PM:</strong> Soporte de baúl de Noche de Confianza, reporte nocturno de caja y cierre.
                  </div>
                </div>

                <div style={{ padding: '0.8rem', borderRadius: '8px', background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.25)' }}>
                  <strong style={{ color: '#38bdf8' }}>Sábado y Domingo de Enrolamiento:</strong>
                  <div style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)' }}>
                    • <strong>Sábado:</strong> 08:00 AM - 13:00 PM y 15:00 PM - 22:30 PM.<br/>
                    • <strong>Domingo:</strong> 08:00 AM Apertura de 3 mesas.<br/>
                    • <strong>21:00 PM:</strong> <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Cierre Contable POS obligatorio:</span> escaneo 100% de fichas físicas y envío del PDF consolidado a Elizabeth Escobar.
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMNA 2: GERENTES DE SEDE */}
            <div className="glass-panel" style={{ padding: '1.6rem', borderRadius: '14px', borderTop: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#fbbf24' }}>
                    👔 Gerentes de Sede
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dirección, Presupuesto y Supervisión</span>
                </div>
                <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', fontWeight: 'bold' }}>
                  Nivel 8
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
                <div style={{ padding: '0.8rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                  <strong style={{ color: '#fbbf24' }}>Lunes de Conciliación & Cierre de Oro:</strong>
                  <div style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)' }}>
                    • <strong>08:30 AM - 12:00 PM:</strong> Cierre de caja del FDS en Nodus (conciliación de fichas físicas vs. depósitos bancarios).<br/>
                    • <strong>12:00 PM:</strong> <span style={{ color: '#ef4444', fontWeight: 'bold' }}>DEADLINE TRIGGER:</span> Impecabilidad Contable (escalamiento N2 ante omisión).<br/>
                    • <strong>15:00 PM - 18:30 PM:</strong> Revisión de resultados y fijación de metas del nuevo ciclo.
                  </div>
                </div>

                <div style={{ padding: '0.8rem', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <strong style={{ color: 'var(--crear-cyan)' }}>Martes y Miércoles:</strong>
                  <div style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)' }}>
                    • <strong>Martes 09:00 AM:</strong> Auditoría de salones, hotel, vuelos y honorarios de entrenadores confirmados y pagados.<br/>
                    • <strong>Martes 15:00 PM:</strong> Sincronización comercial de llamadas con el Quantum Team (QT).<br/>
                    • <strong>Miércoles 19:00 PM:</strong> <span style={{ color: '#ef4444', fontWeight: 'bold' }}>DEADLINE TRIGGER:</span> Auditoría de carga de FI en Nodus por el CMJ (alerta de deserción).
                  </div>
                </div>

                <div style={{ padding: '0.8rem', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <strong style={{ color: 'var(--crear-cyan)' }}>Jueves de Montaje y Fisionomía:</strong>
                  <div style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)' }}>
                    • <strong>14:30 PM - 20:30 PM:</strong> Supervisión en sede del montaje en herradura, altura de techo mínimo 4.5m (seguridad Caída de Confianza), audio y alineación con coordinadores.
                  </div>
                </div>

                <div style={{ padding: '0.8rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                  <strong style={{ color: '#fbbf24' }}>Viernes a Domingo (Gobernanza):</strong>
                  <div style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)' }}>
                    • <strong>Viernes 11:30 AM:</strong> Validación de asistencia oficial (meta 95%).<br/>
                    • <strong>Viernes 14:01 PM:</strong> <span style={{ color: '#ef4444', fontWeight: 'bold' }}>TRIGGER PALABRA ROTA (C2):</span> Bloqueo QR a deudores.<br/>
                    • <strong>Sábado:</strong> Supervisión de seguridad física en Caída de Confianza.<br/>
                    • <strong>Domingo 09:00 AM - 21:00 PM:</strong> Liderazgo en Mesas de Enrolamiento (metas 50% C1➔C2, 70% C2➔MJ) y firma de convenios de pago.
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMNA 3: COORDINADORES (CC1Y2 Y CMJ) */}
            <div className="glass-panel" style={{ padding: '1.6rem', borderRadius: '14px', borderTop: '4px solid #8b5cf6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#c4b5fd' }}>
                    🎯 Coordinadores
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CC1Y2 & CMJ (Maestría)</span>
                </div>
                <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.2)', color: '#c4b5fd', fontWeight: 'bold' }}>
                  Nivel 5 & 6
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
                <div style={{ padding: '0.8rem', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
                  <strong style={{ color: '#c4b5fd' }}>Coordinador C1 y C2 (CC1Y2):</strong>
                  <div style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)' }}>
                    • <strong>Miércoles 20:00 PM (Hora Exacta):</strong> Grounding virtual de aliados por Zoom/Teams (60 min). Suspensión a inasistentes.<br/>
                    • <strong>Jueves 15:00 PM:</strong> Montaje en herradura, audio y limpieza.<br/>
                    • <strong>Jueves 18:00 PM:</strong> Grounding presencial de aliados C1 (Cero Tolerancia, puertas cerradas).<br/>
                    • <strong>Viernes 07:45 AM:</strong> Llegada y terminales Nodus. 11:30 AM reporte de asistencia. 22:00 PM Noche de Confianza con tinas templadas.<br/>
                    • <strong>Sábado:</strong> Apertura, Ticket Naranja y seguridad en Caída de Confianza.<br/>
                    • <strong>Domingo 09:00 AM:</strong> Control directo de Mesa de Enrolamiento C2 en Nodus. 10:30 AM Charla del Avión y Ticket Rojo.
                  </div>
                </div>

                <div style={{ padding: '0.8rem', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
                  <strong style={{ color: '#c4b5fd' }}>Coordinador de Maestría (CMJ):</strong>
                  <div style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)' }}>
                    • <strong>Lunes 09:00 AM:</strong> Reporte de retención inter-FDS en Nodus.<br/>
                    • <strong>Martes:</strong> Llamadas 1 a 1 de auditoría de evidencias FI con mánagers.<br/>
                    • <strong>Miércoles antes 19:00 PM:</strong> <span style={{ color: '#ef4444', fontWeight: 'bold' }}>DEADLINE DE ORO:</span> Cargar en Nodus la revisión de FI de todos los mánagers.<br/>
                    • <strong>Jueves 17:00 PM:</strong> Auditoría presencial de FI con graduados.<br/>
                    • <strong>Viernes 15:30 PM:</strong> Grounding Coach/CMJ y apertura de Maestría 18:00 PM.<br/>
                    • <strong>Domingo 18:00 PM:</strong> Pase de Antorcha de Maestría al salón C1. 21:00 PM Cierre contable y celebración sin mariachis.
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 3: HORARIOS OFICIALES DE SALA & VESTIMENTA */}
      {activeTab === 'horarios_sala' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-panel" style={{ padding: '1.8rem', borderRadius: '16px', borderLeft: '4px solid var(--crear-cyan)' }}>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Clock size={24} color="var(--crear-cyan)" />
              Horarios Oficiales de Entrenamientos en Sala y Código de Vestimenta
            </h2>
            <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-muted)' }}>
              Cronograma de actividades en salón para participantes y contraste contra los turnos de apertura del equipo de oficina, gerencia y coordinación.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            
            {/* C1 */}
            <div className="glass-panel" style={{ padding: '1.4rem', borderTop: '4px solid #8b5cf6', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ color: '#a78bfa', margin: 0, fontSize: '1.2rem' }}>Capítulo UNO (C1)</h3>
                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.2)', color: '#c4b5fd', fontWeight: 'bold' }}>Descubrimiento</span>
              </div>
              <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    <th style={{ padding: '0.4rem 0' }}>DÍA</th>
                    <th style={{ padding: '0.4rem 0' }}>HORARIO</th>
                    <th style={{ padding: '0.4rem 0', textAlign: 'right' }}>VESTIMENTA</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '0.6rem 0', fontWeight: 'bold' }}>Jueves</td>
                    <td style={{ padding: '0.6rem 0', color: 'var(--text-muted)' }}>4:30 PM - Cierre</td>
                    <td style={{ padding: '0.6rem 0', textAlign: 'right' }}>Negro</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(139, 92, 246, 0.08)' }}>
                    <td style={{ padding: '0.6rem 0', fontWeight: 'bold' }}>Viernes</td>
                    <td style={{ padding: '0.6rem 0', color: 'var(--text-muted)' }}>
                      7:30 AM - 3:00 PM<br/>
                      <strong style={{ color: '#a78bfa' }}>5:00 PM - Cierre</strong>
                      <div style={{ fontSize: '0.72rem', color: '#c4b5fd' }}>🌊 Noche de Confianza</div>
                    </td>
                    <td style={{ padding: '0.6rem 0', textAlign: 'right', color: '#f59e0b', fontWeight: 'bold' }}>Negro formal</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '0.6rem 0', fontWeight: 'bold' }}>Sábado</td>
                    <td style={{ padding: '0.6rem 0', color: 'var(--text-muted)' }}>8:00 AM - 4:00 PM<br/>3:00 PM - Cierre</td>
                    <td style={{ padding: '0.6rem 0', textAlign: 'right' }}>Polo / pantalón negro</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.6rem 0', fontWeight: 'bold' }}>Domingo</td>
                    <td style={{ padding: '0.6rem 0', color: 'var(--text-muted)' }}>8:00 AM - Cierre (Graduación)</td>
                    <td style={{ padding: '0.6rem 0', textAlign: 'right' }}>Polo / pantalón negro</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* C2 */}
            <div className="glass-panel" style={{ padding: '1.4rem', borderTop: '4px solid #29abe2', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ color: 'var(--crear-cyan)', margin: 0, fontSize: '1.2rem' }}>Capítulo DOS (C2)</h3>
                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(41, 171, 226, 0.2)', color: '#7dd3fc', fontWeight: 'bold' }}>Avanzado</span>
              </div>
              <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    <th style={{ padding: '0.4rem 0' }}>DÍA</th>
                    <th style={{ padding: '0.4rem 0' }}>HORARIO</th>
                    <th style={{ padding: '0.4rem 0', textAlign: 'right' }}>VESTIMENTA</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '0.6rem 0', fontWeight: 'bold' }}>Jueves</td>
                    <td style={{ padding: '0.6rem 0', color: 'var(--text-muted)' }}>10:30 AM - 4:00 PM<br/>4:00 PM - Cierre</td>
                    <td style={{ padding: '0.6rem 0', textAlign: 'right', color: '#f59e0b', fontWeight: 'bold' }}>Negro formal</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '0.6rem 0', fontWeight: 'bold' }}>Viernes</td>
                    <td style={{ padding: '0.6rem 0', color: 'var(--text-muted)' }}>
                      7:15 AM - 4:00 PM<br/>
                      4:00 PM - Cierre
                      <div style={{ fontSize: '0.72rem', color: '#ef4444' }}>⚠️ 14:01 PM Palabra Rota</div>
                    </td>
                    <td style={{ padding: '0.6rem 0', textAlign: 'right' }}>Polo / pantalón negro</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '0.6rem 0', fontWeight: 'bold' }}>Sábado</td>
                    <td style={{ padding: '0.6rem 0', color: 'var(--text-muted)' }}>7:30 AM - 3:00 PM<br/>3:00 PM - Cierre</td>
                    <td style={{ padding: '0.6rem 0', textAlign: 'right' }}>Polo / pantalón negro</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.6rem 0', fontWeight: 'bold' }}>Domingo</td>
                    <td style={{ padding: '0.6rem 0', color: 'var(--text-muted)' }}>Inicio - Cierre<br/>3:00 PM - Cierre</td>
                    <td style={{ padding: '0.6rem 0', textAlign: 'right' }}>Polo / pantalón negro</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* MJ */}
            <div className="glass-panel" style={{ padding: '1.4rem', borderTop: '4px solid #f59e0b', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ color: '#f59e0b', margin: 0, fontSize: '1.2rem' }}>Maestría del Juego</h3>
                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.2)', color: '#fde68a', fontWeight: 'bold' }}>Liderazgo</span>
              </div>
              <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    <th style={{ padding: '0.4rem 0' }}>DÍA</th>
                    <th style={{ padding: '0.4rem 0' }}>HORARIO</th>
                    <th style={{ padding: '0.4rem 0', textAlign: 'right' }}>VESTIMENTA</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '0.6rem 0', fontWeight: 'bold' }}>Viernes</td>
                    <td style={{ padding: '0.6rem 0', color: 'var(--text-muted)' }}>3:00 PM - 9:00 PM (Alineamiento)</td>
                    <td style={{ padding: '0.6rem 0', textAlign: 'right', color: '#f59e0b', fontWeight: 'bold' }}>Negro formal</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '0.6rem 0', fontWeight: 'bold' }}>Sábado</td>
                    <td style={{ padding: '0.6rem 0', color: 'var(--text-muted)' }}>8:30 AM - 12:00 PM<br/>4:00 PM - 9:00 PM</td>
                    <td style={{ padding: '0.6rem 0', textAlign: 'right' }}>Camiseta / pantalón negro</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.6rem 0', fontWeight: 'bold' }}>Domingo</td>
                    <td style={{ padding: '0.6rem 0', color: 'var(--text-muted)' }}>
                      8:30 AM - 12:00 PM<br/>4:00 PM - Cierre
                      <div style={{ fontSize: '0.72rem', color: 'var(--crear-gold)' }}>🚀 FDS 4 El Viaje (Paul Sosa)</div>
                    </td>
                    <td style={{ padding: '0.6rem 0', textAlign: 'right' }}>Camiseta / pantalón negro</td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>

          {/* NOTA DE VESTIMENTA OFICIAL 2026 */}
          <div style={{ padding: '1.2rem', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '1.5rem' }}>👟</span>
            <div>
              <strong style={{ color: 'var(--crear-gold)' }}>Directiva de Vestimenta 2026:</strong> El <strong>Entrenador / Coach</strong> tiene autorización formal para el uso de <strong>zapatillas deportivas negras limpias</strong> en tarima y sala para preservar su salud física y resistencia. El equipo de oficina, gerencia y coordinación viste de etiqueta negra formal en aperturas y polos corporativos oficiales el fin de semana.
            </div>
          </div>

        </div>
      )}

      {/* MODAL PARA AGENDAR BLOQUE / TURNO */}
      {showAddModal && (
        <div 
          className="modal-backdrop"
          onClick={() => setShowAddModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(6px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div 
            className="glass-panel"
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '520px',
              borderRadius: '16px',
              padding: '1.8rem',
              background: 'var(--bg-glass-heavy, #0c1527)',
              border: '1px solid rgba(41, 171, 226, 0.4)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.9)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.8rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                Agendar Turno / Bloque Operativo
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveBlock} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  Rol Asignado
                </label>
                <select
                  value={newBlock.roleCategory}
                  onChange={e => setNewBlock({ ...newBlock, roleCategory: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                >
                  <option value="oficina">🏢 Equipo de Oficina (Soporte, Caja y Mesas)</option>
                  <option value="gerente">👔 Gerentes de Sede (Gobernanza y Finanzas)</option>
                  <option value="coordinador">🎯 Coordinadores (CC1Y2 & CMJ)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  Título del Bloque / Turno
                </label>
                <input 
                  type="text" 
                  value={newBlock.title}
                  onChange={e => setNewBlock({ ...newBlock, title: e.target.value })}
                  placeholder="Ej. Conciliación de Pagos y Cierre POS"
                  required
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    Rango Horario
                  </label>
                  <input 
                    type="text" 
                    value={newBlock.time}
                    onChange={e => setNewBlock({ ...newBlock, time: e.target.value })}
                    placeholder="09:00 - 13:30"
                    required
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    Tipo de Tarea
                  </label>
                  <select
                    value={newBlock.type}
                    onChange={e => setNewBlock({ ...newBlock, type: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                  >
                    {Object.entries(BLOCK_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    Responsable / Titular
                  </label>
                  <input 
                    type="text" 
                    value={newBlock.owner}
                    onChange={e => setNewBlock({ ...newBlock, owner: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    Sede
                  </label>
                  <select
                    value={newBlock.sede}
                    onChange={e => setNewBlock({ ...newBlock, sede: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                  >
                    <option value="Todas">Todas las Sedes</option>
                    {OPERATIONAL_SEDES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  Detalles / Protocolo Nodus
                </label>
                <textarea 
                  value={newBlock.notes}
                  onChange={e => setNewBlock({ ...newBlock, notes: e.target.value })}
                  rows={2}
                  placeholder="Detalles sobre entregables, terminales, escaneo o deadlines..."
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', fontSize: '0.88rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '0.5rem' }}>
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '0.5rem 1.4rem', fontSize: '0.85rem', fontWeight: 700 }}
                >
                  Guardar Turno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
