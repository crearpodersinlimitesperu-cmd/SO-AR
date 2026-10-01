// Sede geográfica. Los ciclos/equipos de Quito se conservan en sus campos propios.
export const canonicalSede = (value) => {
  const raw = String(value ?? '').trim();
  const key = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (!key || key.includes('global')) return 'Global';
  if (key === 'med' || key.includes('medellin')) return 'Medellín';
  if (key === 'lim' || key.includes('lima')) return 'Lima';
  if (key === 'cue' || key.includes('cuenca')) return 'Cuenca';
  if (key === 'gye' || key.includes('guayaquil')) return 'Guayaquil';
  if (key === 'mex' || key === 'cdmx' || key.includes('mexico')) return 'México';
  if (key.includes('uio') || key.includes('quito') || /ciclo\s*[12]/.test(key)) return 'Quito';
  if (key === 'int' || key.includes('internacional')) return 'Internacional';
  return raw;
};
