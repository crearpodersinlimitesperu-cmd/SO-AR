export const getFlagForSede = (sede) => {
  if (!sede) return '🌎';
  const s = sede.toLowerCase();

  const flagImg = (code) => (
    <img 
      src={`https://flagcdn.com/${code}.svg`} 
      height="14" 
      alt={code} 
      style={{ display: 'inline-block', verticalAlign: 'middle', borderRadius: '2px', marginLeft: '2px', marginRight: '2px', marginTop: '-2px' }} 
    />
  );

  if (s.includes('ecuador') || s.includes('uio') || s.includes('quito') || s.includes('guayaquil') || s.includes('gye') || s.includes('cuenca') || s.includes('cue')) {
    return flagImg('ec');
  }
  if (s.includes('lima') || s.includes('lim') || s.includes('peru') || s.includes('perú')) {
    return flagImg('pe');
  }
  if (s.includes('colombia') || s.includes('med') || s.includes('medellin') || s.includes('medellín') || s.includes('bogota') || s.includes('bogotá')) {
    return flagImg('co');
  }
  if (s.includes('mexico') || s.includes('mex') || s.includes('mx') || s.includes('méxico')) {
    return flagImg('mx');
  }
  
  return '🌎'; // Global / Multinacional
};
