import React from 'react';

/**
 * Renderiza banderas vectoriales SVG nítidas en cualquier dispositivo (Windows, iOS, Android, Mac, Linux).
 * Evita la limitación de Windows que muestra dos letras (EC, PE, CO, MX) en lugar de la bandera gráfica.
 */
export const FlagIcon = ({ sede = '', country = '', size = 16, style = {} }) => {
  const target = (sede || country || '').toLowerCase().trim();

  let code = 'un';
  let title = 'Global';

  if (target.includes('ecuador') || target.includes('uio') || target.includes('quito') || target.includes('guayaquil') || target.includes('gye') || target.includes('cuenca') || target.includes('cue') || target === 'ec') {
    code = 'ec';
    title = 'Ecuador';
  } else if (target.includes('lima') || target.includes('lim') || target.includes('peru') || target.includes('perú') || target === 'pe') {
    code = 'pe';
    title = 'Perú';
  } else if (target.includes('colombia') || target.includes('med') || target.includes('medellin') || target.includes('medellín') || target === 'co') {
    code = 'co';
    title = 'Colombia';
  } else if (target.includes('mexico') || target.includes('mex') || target.includes('mx') || target.includes('méxico') || target.includes('cdmx')) {
    code = 'mx';
    title = 'México';
  }

  if (code === 'un') {
    return (
      <span 
        title="Sede Global" 
        style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          fontSize: `${size}px`, 
          lineHeight: 1, 
          verticalAlign: 'middle',
          margin: '0 4px',
          ...style 
        }}
      >
        🌎
      </span>
    );
  }

  const width = Math.round(size * 1.35);

  return (
    <img 
      src={`https://flagcdn.com/${code}.svg`} 
      height={size} 
      width={width}
      alt={title} 
      title={title} 
      loading="lazy"
      style={{ 
        display: 'inline-block', 
        verticalAlign: 'middle', 
        borderRadius: '3px', 
        objectFit: 'cover',
        boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
        margin: '0 4px',
        flexShrink: 0,
        ...style 
      }} 
    />
  );
};

export const getFlagForSede = (sede, size = 16) => {
  return <FlagIcon sede={sede} size={size} />;
};

export default FlagIcon;
