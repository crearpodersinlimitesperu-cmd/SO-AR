export const OFFICIAL_CALENDAR_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1u0tc4GeooPmSwNxZ0CErKGtRU4oD-mO3l--ZSQM-KPs/export?format=csv&gid=1326951636';

// CSV preserves mixed numeric/team-cohort cells that Google Visualization drops.
export function parseOfficialCalendarSheet(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    if (character === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (quoted || field === '') {
        quoted = !quoted;
      } else {
        throw new Error('Comillas inválidas en el calendario CSV.');
      }
    } else if (!quoted && (character === ',' || character === '\n' || character === '\r')) {
      row.push(field);
      field = '';
      if (character !== ',') {
        rows.push(row);
        row = [];
        if (character === '\r' && text[i + 1] === '\n') i++;
      }
    } else {
      field += character;
    }
  }
  if (quoted) throw new Error('Calendario CSV incompleto.');
  if (field || row.length) rows.push([...row, field]);
  const header = rows.shift()?.map(value => value.replace(/^\uFEFF/, '').trim().toLowerCase());
  if (!header || header[0] !== 'fecha' || header[2] !== 'equipo' ||
      header[3] !== 'entrenamiento' || header.length < 7) {
    throw new Error('Cambió el esquema de la hoja del calendario oficial.');
  }
  return rows.flatMap(cells => {
    if (cells.every(cell => !cell.trim())) return [];
    const start = cells[0]?.trim();
    // Non-event rows in the source may have no date; never infer one.
    if (!start) return [];
    const date = new Date(`${start}T00:00:00Z`);
    if (cells.length !== header.length || !/^\d{4}-\d{2}-\d{2}$/.test(start) ||
        !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== start) {
      throw new Error('Fila o fecha inválida en el calendario oficial.');
    }
    return [{
      fecha_inicio: `${start}T00:00:00`, fecha_fin: '',
      sede: cells[1].trim(), equipo: cells[2].trim(), nombre: cells[3].trim(),
      trainer: cells[4].trim(), lugar: cells[5].trim(), direccion: cells[6].trim(),
      source: 'official_sheet_crosscheck'
    }];
  });
}
