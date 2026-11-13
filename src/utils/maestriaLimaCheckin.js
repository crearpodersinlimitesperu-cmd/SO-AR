/**
 * Enlaces oficiales de check-in / asistencia en Nodus por cohorte de Maestría del Juego (Lima)
 * mostrados obligatoriamente tras firmar los acuerdos en /reglas-maestria.
 */
export const LIMA_MAESTRIA_CHECKIN_LINKS = {
  '30': {
    teamNumber: '30',
    label: 'Equipo 30 — Tinkuy Ruray',
    url: 'https://imo.crearpslglobal.com/maestria/checkin/134/TFD'
  },
  '31': {
    teamNumber: '31',
    label: 'Equipo 31 — Imperio del Éxito',
    url: 'https://imo.crearpslglobal.com/maestria/checkin/141/SFD'
  },
  '32': {
    teamNumber: '32',
    label: 'Equipo 32 — Sede Lima (Cohorte Actual)',
    url: 'https://imo.crearpslglobal.com/maestria/checkin/149/PFD'
  }
};

export function getLimaMaestriaCheckinInfo(equipoText) {
  const raw = String(equipoText || '').trim();
  const match = raw.match(/\b(30|31|32)\b/);
  if (!match) return null;
  return LIMA_MAESTRIA_CHECKIN_LINKS[match[1]] || null;
}
