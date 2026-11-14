/**
 * Trazabilidad Contable de Pagos Nodus (C1 -> C2 -> Maestría)
 * Normaliza, cruza y ordena el historial de pagos desde /api/pagos y /api/participante
 * sin inventar montos ni estados cuando Nodus aún no devuelve registros.
 */

const normalizeText = (val) =>
  String(val || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export const normalizeDocForPayments = (val) =>
  String(val || '')
    .replace(/^(dni|ce|pasaporte|doc|ruc)[:\s-]*/i, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .trim();

const normalizeStageHaystack = (rawStage, rawConcept = '', rawTeam = '', rawNotes = '') =>
  normalizeText(`${rawStage || ''} ${rawConcept || ''} ${rawTeam || ''} ${rawNotes || ''}`)
    .replace(/[_/+\-.,:;|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function inferPaymentStages(rawStage, rawConcept = '', rawTeam = '', rawNotes = '') {
  const hay = normalizeStageHaystack(rawStage, rawConcept, rawTeam, rawNotes);
  if (!hay) return [];
  const stages = [];
  if (/\b(c1|cap\s*1|capitulo\s*1|primer\s*capitulo|basico|intro)\b/.test(hay)) {
    stages.push('C1');
  }
  if (/\b(c2|cap\s*2|capitulo\s*2|segundo\s*capitulo|avanzado)\b/.test(hay)) {
    stages.push('C2');
  }
  if (
    /\b(mj|maestria|pfd|sfd|tfd|primer\s*fin|1er\s*fin|segundo\s*fin|2do\s*fin|tercer\s*fin|3er\s*fin|caminata|taller)\b/.test(hay)
  ) {
    stages.push('MJ');
  }
  return stages;
}

export function inferPaymentStage(rawStage, rawConcept = '', rawTeam = '', rawNotes = '') {
  const stages = inferPaymentStages(rawStage, rawConcept, rawTeam, rawNotes);
  if (stages.includes('MJ')) return 'MJ';
  if (stages.includes('C2')) return 'C2';
  if (stages.includes('C1')) return 'C1';
  const hay = normalizeStageHaystack(rawStage, rawConcept, rawTeam, rawNotes);
  if (!hay) return 'OTRO';
  return String(rawStage || '').trim().toUpperCase() || 'OTRO';
}

export function normalizeNodusPaymentRow(row, fallbackStage = '') {
  if (!row || typeof row !== 'object') return null;

  const idFacturaRaw = row.id_factura ?? row.factura_id ?? row.id ?? row.codigo ?? '';
  const idFactura = idFacturaRaw !== '' && idFacturaRaw !== null ? String(idFacturaRaw).trim() : '';
  const numeroFacturaRaw =
    row.numero_factura ??
    row.nro_factura ??
    row.num_factura ??
    row.factura ??
    row.serie_numero ??
    idFactura;
  const numeroFactura = numeroFacturaRaw !== '' && numeroFacturaRaw !== null ? String(numeroFacturaRaw).trim() : '';

  const fecha = String(
    row.fecha ||
    row.fecha_pago ||
    row.fecha_registro ||
    row.created_at ||
    ''
  ).trim();

  const concepto = String(
    row.concepto ||
    row.descripcion ||
    row.detalle ||
    row.producto ||
    row.nombre_producto ||
    row.plan ||
    row.entrenamiento ||
    row.tipo_entrenamiento ||
    row.nombre_entrenamiento ||
    row.curso ||
    row.modulo ||
    row.taller ||
    row.etapa ||
    row.capitulo ||
    row.observacion ||
    row.observaciones ||
    row.notas ||
    row.glosa ||
    'Pago Nodus'
  ).trim();

  const rawStage =
    row.etapa ||
    row.capitulo ||
    row.programa ||
    row.nivel ||
    row.entrenamiento ||
    row.tipo_entrenamiento ||
    row.nombre_entrenamiento ||
    row.curso ||
    row.modulo ||
    row.taller ||
    row.categoria ||
    row.servicio ||
    row.tipo_servicio ||
    row.tipo ||
    fallbackStage ||
    '';
  const equipo = String(
    row.equipo?.nombre ||
    row.equipo_nombre ||
    (typeof row.equipo === 'string' ? row.equipo : '') ||
    (row.id_equipo ? `Equipo ${row.id_equipo}` : '')
  ).trim();

  const rawNotes = String(row.observacion || row.observaciones || row.notas || row.glosa || '').trim();
  const etapas = inferPaymentStages(rawStage, concepto, equipo, rawNotes);
  const etapa = inferPaymentStage(rawStage, concepto, equipo, rawNotes);

  const modoPago = String(
    row.metodo_pago ||
    row.modo_pago ||
    row.forma_pago ||
    row.medio_pago ||
    row.tipo_pago ||
    row.canal_pago ||
    row.pasarela ||
    row.metodo ||
    ''
  ).trim();

  const referencia = String(
    row.referencia ||
    row.nro_operacion ||
    row.numero_operacion ||
    row.comprobante ||
    row.nro_comprobante ||
    row.voucher ||
    row.codigo_autorizacion ||
    row.operacion ||
    ''
  ).trim();

  const montoRaw = row.monto ?? row.valor ?? row.importe ?? row.total ?? row.monto_pagado ?? null;
  const montoNum = montoRaw !== null && montoRaw !== '' && Number.isFinite(Number(String(montoRaw).replace(/,/g, '')))
    ? Number(String(montoRaw).replace(/,/g, ''))
    : null;

  const moneda = String(row.moneda || row.currency || 'PEN').toUpperCase().trim() || 'PEN';
  const estado = String(row.estado || row.status || row.estado_pago || 'Confirmado').trim();
  const registradoPor = String(
    row.usuario_registro ||
    row.cajero ||
    row.registrado_por ||
    row.coordinador ||
    ''
  ).trim();

  const identificacion = normalizeDocForPayments(
    row.identificacion ||
    row.dni ||
    row.documento ||
    row.nro_documento ||
    row.participante?.identificacion ||
    ''
  );

  const participanteId = row.id_participante ?? row.participante_id ?? row.participante?.id ?? null;
  const email = normalizeText(row.email || row.correo || row.participante?.email || '');
  const participanteNombre = normalizeText(
    row.participante_nombre ||
    row.nombre_participante ||
    row.nombre ||
    (row.participante ? `${row.participante.nombres || ''} ${row.participante.apellidos || ''}` : '')
  );

  return {
    idFactura,
    numeroFactura,
    fecha,
    etapa,
    etapas,
    concepto,
    modoPago,
    referencia,
    monto: montoNum,
    moneda,
    estado,
    equipo,
    registradoPor,
    identificacion,
    participanteId: participanteId != null ? String(participanteId).trim() : '',
    email,
    participanteNombre,
    raw: row
  };
}

export function formatCurrencyAmount(amount, currency = 'PEN') {
  if (!Number.isFinite(Number(amount))) return '—';
  const curr = String(currency || 'PEN').toUpperCase();
  const prefix = curr === 'USD' ? 'US$' : 'S/';
  return `${prefix} ${Number(amount).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export function extractParticipantNodusStageStatus(nodusRecord) {
  if (!nodusRecord || typeof nodusRecord !== 'object') {
    return { c1Paid: null, c2Paid: null, mjPaid: null, embeddedPayments: [] };
  }

  const embeddedPayments = [];
  const pushArray = (arr, fallbackStage) => {
    if (!Array.isArray(arr)) return;
    for (const row of arr) {
      const norm = normalizeNodusPaymentRow(row, fallbackStage);
      if (norm) embeddedPayments.push(norm);
    }
  };

  pushArray(nodusRecord.pagos, '');
  pushArray(nodusRecord.abonos, 'ABONO');
  pushArray(nodusRecord.facturas, '');
  pushArray(nodusRecord.historial_pagos, '');
  if (Array.isArray(nodusRecord.etapas)) {
    for (const et of nodusRecord.etapas) {
      const stageGuess = inferPaymentStage(et?.etapa || et?.nombre || et?.codigo || '');
      pushArray(et?.pagos, stageGuess);
      pushArray(et?.abonos, stageGuess);
    }
  }

  const c1Paid = nodusRecord.capitulo1 && typeof nodusRecord.capitulo1 === 'object'
    ? Boolean(nodusRecord.capitulo1.pagado || nodusRecord.capitulo1.asistio)
    : null;
  const c2Paid = nodusRecord.capitulo2 && typeof nodusRecord.capitulo2 === 'object'
    ? Boolean(nodusRecord.capitulo2.pagado || nodusRecord.capitulo2.asistio)
    : null;
  const mjPaid = nodusRecord.maestria && typeof nodusRecord.maestria === 'object'
    ? Boolean(nodusRecord.maestria.pagado || nodusRecord.maestria.asistio)
    : null;

  return { c1Paid, c2Paid, mjPaid, embeddedPayments };
}

export function buildParticipantPaymentTraceability({
  contrato = {},
  nodusCross = {},
  allPagos = []
} = {}) {
  const nodusRecord = nodusCross?.nodusRecord || null;
  const candidateDocs = new Set(
    [
      contrato.numeroDocumento,
      contrato.doc,
      nodusCross?.nodusDoc,
      nodusRecord?.identificacion,
      nodusRecord?.dni
    ]
      .map(normalizeDocForPayments)
      .filter((d) => d.length >= 5)
  );

  const candidateIds = new Set(
    [
      nodusRecord?.id,
      nodusRecord?.id_participante,
      nodusCross?.rosterEntry?.id,
      nodusCross?.rosterEntry?.id_participante
    ]
      .filter((v) => v !== undefined && v !== null && String(v).trim() !== '')
      .map((v) => String(v).trim())
  );

  const candidateEmails = new Set(
    [contrato.email, nodusRecord?.email, nodusCross?.rosterEntry?.email]
      .map(normalizeText)
      .filter((e) => e.includes('@'))
  );

  const candidateNames = new Set(
    [
      contrato.nombre,
      nodusRecord ? `${nodusRecord.nombres || ''} ${nodusRecord.apellidos || ''}` : '',
      nodusCross?.rosterEntry ? `${nodusCross.rosterEntry.nombres || ''} ${nodusCross.rosterEntry.apellidos || ''}` : ''
    ]
      .map(normalizeText)
      .filter((n) => n.split(' ').length >= 2)
  );

  const { c1Paid, c2Paid, mjPaid, embeddedPayments } = extractParticipantNodusStageStatus(nodusRecord);

  const matchedNormalized = [...embeddedPayments];
  const normalizedApiRows = (Array.isArray(allPagos) ? allPagos : [])
    .map((row) => normalizeNodusPaymentRow(row))
    .filter(Boolean);

  for (const p of normalizedApiRows) {
    const byDoc = p.identificacion && candidateDocs.has(p.identificacion);
    const byId = p.participanteId && candidateIds.has(p.participanteId);
    const byEmail = p.email && candidateEmails.has(p.email);
    const byName = !p.identificacion && !p.participanteId && !p.email && p.participanteNombre && candidateNames.has(p.participanteNombre);
    if (byDoc || byId || byEmail || byName) {
      matchedNormalized.push(p);
    }
  }

  const deduped = [];
  const seen = new Set();
  for (const p of matchedNormalized) {
    const key = p.idFactura
      ? `f:${p.idFactura}`
      : `${p.fecha}|${p.monto ?? ''}|${p.modoPago}|${p.concepto}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(p);
  }

  const stageOrder = { C1: 1, C2: 2, MJ: 3, OTRO: 4 };
  deduped.sort((a, b) => {
    const da = String(a.fecha || '');
    const db = String(b.fecha || '');
    if (da && db && da !== db) return da.localeCompare(db);
    return (stageOrder[a.etapa] || 9) - (stageOrder[b.etapa] || 9);
  });

  const totalByCurrency = {};
  const modesSet = new Set();
  const stagesSet = new Set();
  const invoicesSet = new Set();

  for (const p of deduped) {
    if (p.monto !== null) {
      totalByCurrency[p.moneda] = (totalByCurrency[p.moneda] || 0) + p.monto;
    }
    if (p.modoPago) modesSet.add(p.modoPago);
    if (Array.isArray(p.etapas) && p.etapas.length > 0) {
      p.etapas.forEach((st) => stagesSet.add(st));
    } else if (p.etapa) {
      stagesSet.add(p.etapa);
    }
    const inv = p.numeroFactura || p.idFactura;
    if (inv) invoicesSet.add(inv);
  }

  const stageSummary = {
    C1: stagesSet.has('C1') || c1Paid === true || Boolean(nodusCross?.pagadoC1),
    C2: stagesSet.has('C2') || c2Paid === true || Boolean(nodusCross?.pagadoC2),
    MJ: stagesSet.has('MJ') || mjPaid === true
  };

  const hasUnclassifiedPayments = deduped.some(
    (p) => !['C1', 'C2', 'MJ'].includes(p.etapa) && (!Array.isArray(p.etapas) || p.etapas.length === 0)
  );
  const allPaymentsUnclassified =
    deduped.length > 0 && !stagesSet.has('C1') && !stagesSet.has('C2') && !stagesSet.has('MJ');

  return {
    payments: deduped,
    totalByCurrency,
    paymentModes: Array.from(modesSet),
    invoiceNumbers: Array.from(invoicesSet),
    stagesPresent: ['C1', 'C2', 'MJ', 'OTRO'].filter((s) => stagesSet.has(s)),
    stageSummary,
    hasUnclassifiedPayments,
    allPaymentsUnclassified
  };
}
