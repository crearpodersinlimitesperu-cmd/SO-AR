import { doc, runTransaction } from 'firebase/firestore';

const FIRESTORE_PROJECT_ID = 'centro-operativo-cpsl';
const FIRESTORE_REST_BASE = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/(default)/documents`;

/**
 * Normaliza el número de documento (DNI, CE, Pasaporte, PTP):
 * - Elimina prefijos accidentales ("DNI:", "CE-", "PASAPORTE ", etc.)
 * - Elimina espacios, guiones, puntos y símbolos no alfanuméricos
 * - Convierte a MAYÚSCULAS canónicas (ej. "08130068", "008362020", "A9919241")
 */
export function normalizeLimaDocNumber(raw) {
  const cleanedPrefix = String(raw || '')
    .trim()
    .replace(/^(?:DNI|C\.?E\.?|CARNE\s*DE\s*EXTRANJERIA|PASAPORTE|PASS|PTP|RUC|DOC(?:UMENTO)?)[\s:.\-#]*/i, '');
  return cleanedPrefix.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 24);
}

/**
 * Extrae el documento normalizado desde un registro de Firestore, incluso si es
 * un registro legado donde solo existe `doc: "DNI: 45892147"` y `numeroDocumento` está vacío.
 */
export function extractRecordNormalizedDoc(record = {}) {
  const fromNum = normalizeLimaDocNumber(record.numeroDocumentoNorm || record.numeroDocumento || '');
  if (fromNum) return fromNum;
  if (record.doc) {
    const afterColon = String(record.doc).includes(':')
      ? String(record.doc).split(':').slice(1).join(':')
      : String(record.doc);
    return normalizeLimaDocNumber(afterColon);
  }
  return '';
}

/**
 * Para documentos puramente numéricos (>= 7 dígitos, ej. DNI/CE), obtiene el núcleo
 * sin ceros a la izquierda para bloquear duplicados tipo "08130068" vs "8130068".
 */
export function numericDocCore(normDoc) {
  if (!normDoc || !/^\d{7,15}$/.test(normDoc)) return '';
  return normDoc.replace(/^0+/, '') || '0';
}

export function normalizeLimaEmail(raw) {
  return String(raw || '').trim().toLowerCase();
}

export function normalizeLimaPersonName(raw) {
  return String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * ID determinístico de documento en Firestore para garantizar unicidad ACID en motor de base de datos:
 * `contratos_caminata_fuego/doc_08130068` o `contratos_maestria_lima/doc_008362020`
 */
export function buildDeterministicContractDocId(rawDoc) {
  const norm = normalizeLimaDocNumber(rawDoc);
  if (!norm || norm.length < 4) {
    throw new Error('Número de documento inválido para registro único.');
  }
  return `doc_${norm.slice(0, 24)}`;
}

/**
 * Verifica si dos números de documento representan a la misma persona.
 */
export function isSameNormalizedDoc(docA, docB) {
  if (!docA || !docB) return false;
  if (docA === docB) return true;
  const coreA = numericDocCore(docA);
  const coreB = numericDocCore(docB);
  return Boolean(coreA && coreB && coreA.length >= 6 && coreA === coreB);
}

/**
 * Busca si un participante ya tiene un contrato firmado en la colección por:
 * 1) Número de Documento (exacto o equivalente sin ceros iniciales)
 * 2) Correo electrónico personal
 * 3) Nombre y apellidos completos exactos (mínimo 2 palabras y >= 8 caracteres)
 */
export function findMatchingLimaContract(existingRecords = [], candidate = {}) {
  const candDoc = normalizeLimaDocNumber(candidate.numeroDocumento || candidate.doc || '');
  const candEmail = normalizeLimaEmail(candidate.email || '');
  const candName = normalizeLimaPersonName(candidate.nombreCompleto || candidate.nombre || '');
  const candNameTokens = candName ? candName.split(' ').filter(Boolean) : [];

  for (const item of existingRecords) {
    if (!item) continue;
    const dbDoc = extractRecordNormalizedDoc(item);
    const dbEmail = normalizeLimaEmail(item.email || '');
    const dbName = normalizeLimaPersonName(item.nombreCompleto || item.nombre || '');

    if (candDoc && dbDoc && isSameNormalizedDoc(candDoc, dbDoc)) {
      return { record: item, matchReason: 'número de documento' };
    }
    if (candEmail && dbEmail && candEmail === dbEmail) {
      return { record: item, matchReason: 'correo electrónico' };
    }
    if (
      candNameTokens.length >= 2 &&
      candName.length >= 8 &&
      dbName &&
      candName === dbName
    ) {
      return { record: item, matchReason: 'nombre completo' };
    }
  }

  return null;
}

function withPromiseTimeout(promise, ms = 5500) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`FIRESTORE_TIMEOUT_${ms}MS`)), ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function parseFirestoreRestDoc(item) {
  if (!item || !item.fields) return null;
  const id = String(item.name || '').split('/').pop();
  const out = { id, _createTime: item.createTime };
  for (const [k, v] of Object.entries(item.fields)) {
    if ('stringValue' in v) out[k] = v.stringValue;
    else if ('booleanValue' in v) out[k] = v.booleanValue;
    else if ('integerValue' in v) out[k] = Number(v.integerValue);
    else if ('doubleValue' in v) out[k] = Number(v.doubleValue);
    else if ('timestampValue' in v) out[k] = v.timestampValue;
    else if ('nullValue' in v) out[k] = null;
  }
  return out;
}

function toFirestoreRestFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || typeof v === 'function') continue;
    // Omitir sentinelas serverTimestamp() de Firebase SDK; añadimos createdAt ISO
    if (v && typeof v === 'object' && ('_methodName' in v || 'isEqual' in v)) {
      fields[k] = { timestampValue: new Date().toISOString() };
      continue;
    }
    if (v === null) fields[k] = { nullValue: null };
    else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
    else if (typeof v === 'number') {
      fields[k] = Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    } else {
      fields[k] = { stringValue: String(v) };
    }
  }
  if (!fields.createdAt) {
    fields.createdAt = { timestampValue: new Date().toISOString() };
  }
  return fields;
}

/**
 * Obtiene TODOS los registros de una colección de contratos Lima de forma fail-closed:
 * intenta primero el SDK de Firestore y, si tarda o falla, consulta paginadamente la API REST.
 */
export async function fetchAllLimaContractsFailClosed(collectionName, sdkGetter = null) {
  if (typeof sdkGetter === 'function') {
    try {
      const snap = await withPromiseTimeout(sdkGetter(), 5000);
      const records = [];
      snap.forEach((docSnap) => {
        records.push({ id: docSnap.id, ...docSnap.data() });
      });
      return records;
    } catch (sdkErr) {
      console.warn(`[Anti-Duplicados] Lectura SDK omitida (${sdkErr?.message || sdkErr}); usando respaldo REST paginado.`);
    }
  }

  const allDocs = [];
  let pageToken = '';
  do {
    const url = `${FIRESTORE_REST_BASE}/${collectionName}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const res = await withPromiseTimeout(fetch(url), 6500);
    if (!res.ok) {
      throw new Error(`REST_LIST_FAILED_${res.status}`);
    }
    const json = await res.json();
    for (const item of json.documents || []) {
      const parsed = parseFirestoreRestDoc(item);
      if (parsed) allDocs.push(parsed);
    }
    pageToken = json.nextPageToken || '';
  } while (pageToken);

  return allDocs;
}

async function fetchSingleLimaContractRest(collectionName, docId) {
  const res = await withPromiseTimeout(fetch(`${FIRESTORE_REST_BASE}/${collectionName}/${encodeURIComponent(docId)}`), 5000);
  if (!res.ok) return null;
  const json = await res.json();
  return parseFirestoreRestDoc(json);
}

/**
 * Registra de manera ATÓMICA e IRREPETIBLE un contrato en `contratos_caminata_fuego` o `contratos_maestria_lima`.
 * - Paso 1: Verificación fail-closed contra todos los registros previos (Documento, Correo o Nombre completo).
 * - Paso 2: Creación determinística en `doc_<NUMERO_DOCUMENTO_NORM>` mediante transacción ACID
 *   y respaldo REST `createDocument?documentId=doc_<NORM>` (HTTP 409 si ya existe, cero doble escritura).
 *
 * Retorna:
 * - `{ status: 'CREATED', docId }` si se creó por primera y única vez.
 * - `{ status: 'DUPLICATE', existingRecord, matchReason }` si ya estaba registrado.
 */
export async function registerUniqueLimaContract({ db, collectionName, payload, sdkCollectionGetter }) {
  const numeroDocumentoNorm = normalizeLimaDocNumber(payload.numeroDocumento || payload.doc || '');
  const deterministicId = buildDeterministicContractDocId(numeroDocumentoNorm);
  const enrichedPayload = {
    ...payload,
    numeroDocumentoNorm,
    email: normalizeLimaEmail(payload.email || '')
  };

  // 1. Pre-verificación integral fail-closed (incluye registros legados con ID aleatorio)
  const existingRecords = await fetchAllLimaContractsFailClosed(collectionName, sdkCollectionGetter);
  const match = findMatchingLimaContract(existingRecords, enrichedPayload);
  if (match) {
    return {
      status: 'DUPLICATE',
      existingRecord: match.record,
      matchReason: match.matchReason
    };
  }

  // 2. Escritura atómica determinística sobre `doc_<NUMERO_DOCUMENTO_NORM>`
  if (db) {
    try {
      await withPromiseTimeout(
        runTransaction(db, async (tx) => {
          const targetRef = doc(db, collectionName, deterministicId);
          const snap = await tx.get(targetRef);
          if (snap.exists()) {
            const dupError = new Error('ALREADY_REGISTERED');
            dupError.code = 'already-exists';
            dupError.existingRecord = { id: snap.id, ...snap.data() };
            throw dupError;
          }
          tx.set(targetRef, enrichedPayload);
        }),
        6000
      );
      return { status: 'CREATED', docId: deterministicId, payload: enrichedPayload };
    } catch (txErr) {
      if (txErr?.code === 'already-exists' && txErr.existingRecord) {
        return {
          status: 'DUPLICATE',
          existingRecord: txErr.existingRecord,
          matchReason: 'número de documento'
        };
      }
      // Si falló por reglas (ej. el doc ya fue creado en otra pestaña milisegundos antes), verificar si ya existe
      if (txErr?.code === 'permission-denied') {
        const current = await fetchSingleLimaContractRest(collectionName, deterministicId).catch(() => null);
        if (current) {
          return {
            status: 'DUPLICATE',
            existingRecord: current,
            matchReason: 'número de documento'
          };
        }
      }
      console.warn(`[Anti-Duplicados] Transacción SDK en ${collectionName} no completada (${txErr?.message || txErr}); ejecutando createDocument REST atómico.`);
    }
  }

  // 3. Respaldo REST atómico (`POST ?documentId=doc_<NORM>` jamás sobrescribe ni duplica; devuelve 409 si ya existe)
  const createUrl = `${FIRESTORE_REST_BASE}/${collectionName}?documentId=${encodeURIComponent(deterministicId)}`;
  const restRes = await withPromiseTimeout(
    fetch(createUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: toFirestoreRestFields(enrichedPayload) })
    }),
    6500
  );

  if (restRes.status === 409 || restRes.status === 403) {
    const existing = await fetchSingleLimaContractRest(collectionName, deterministicId);
    if (existing) {
      return {
        status: 'DUPLICATE',
        existingRecord: existing,
        matchReason: 'número de documento'
      };
    }
  }

  if (!restRes.ok) {
    const errTxt = await restRes.text().catch(() => '');
    throw new Error(`Error persistiendo contrato único (${restRes.status}): ${errTxt.slice(0, 180)}`);
  }

  return { status: 'CREATED', docId: deterministicId, payload: enrichedPayload };
}

function getRecordTimestampMs(item = {}) {
  if (item.createdAt?.toMillis) return item.createdAt.toMillis();
  for (const field of ['fechaValidacionIso', 'isoTimestamp', 'createdAt', '_createTime']) {
    if (item[field]) {
      const parsed = Date.parse(item[field]);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

/**
 * Deduplica en tiempo real la lista mostrada en los Monitores de Lima (`/monitor-imos?tab=monitores_lima`),
 * conservando 1 único registro canónico por persona (el primero firmado) y adjuntando `_allDocIds`
 * para que si oficina elimina el registro desde el monitor, se borren también posibles copias legadas.
 */
export function deduplicateSignedContracts(rawRecords = []) {
  // Ordenar cronológicamente ascendente para conservar el primer registro original válido
  const chronological = [...rawRecords].sort((a, b) => getRecordTimestampMs(a) - getRecordTimestampMs(b));
  const uniqueList = [];

  for (const item of chronological) {
    const match = findMatchingLimaContract(uniqueList, item);
    if (!match) {
      uniqueList.push({
        ...item,
        _allDocIds: item.id ? [item.id] : []
      });
    } else if (item.id && !match.record._allDocIds.includes(item.id)) {
      match.record._allDocIds.push(item.id);
    }
  }

  // Devolver ordenados por más reciente primero para la tabla del Monitor
  return uniqueList.sort((a, b) => getRecordTimestampMs(b) - getRecordTimestampMs(a));
}
