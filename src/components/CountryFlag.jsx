import React from 'react';

const FLAGS = {
  ec: (
    <svg viewBox="0 0 640 480" width="18" height="13" style={{ borderRadius: '2px', display: 'inline-block', verticalAlign: 'middle', boxShadow: '0 0 2px rgba(0,0,0,0.3)', flexShrink: 0 }}>
      <g fillRule="evenodd" strokeWidth="1pt">
        <path fill="#ffd100" d="M0 0h640v240H0z"/>
        <path fill="#0035a0" d="M0 240h640v120H0z"/>
        <path fill="#e21836" d="M0 360h640v120H0z"/>
        <ellipse cx="320" cy="240" rx="28" ry="32" fill="#d97706" />
        <ellipse cx="320" cy="240" rx="22" ry="24" fill="#0284c7" />
        <ellipse cx="320" cy="240" rx="14" ry="16" fill="#15803d" />
      </g>
    </svg>
  ),
  pe: (
    <svg viewBox="0 0 640 480" width="18" height="13" style={{ borderRadius: '2px', display: 'inline-block', verticalAlign: 'middle', boxShadow: '0 0 2px rgba(0,0,0,0.3)', flexShrink: 0 }}>
      <g fillRule="evenodd" strokeWidth="1pt">
        <path fill="#d91023" d="M0 0h213.3v480H0z"/>
        <path fill="#ffffff" d="M213.3 0h213.4v480H213.3z"/>
        <path fill="#d91023" d="M426.7 0H640v480H426.7z"/>
        <ellipse cx="320" cy="240" rx="20" ry="22" fill="#15803d" opacity="0.8" />
      </g>
    </svg>
  ),
  co: (
    <svg viewBox="0 0 640 480" width="18" height="13" style={{ borderRadius: '2px', display: 'inline-block', verticalAlign: 'middle', boxShadow: '0 0 2px rgba(0,0,0,0.3)', flexShrink: 0 }}>
      <g fillRule="evenodd" strokeWidth="1pt">
        <path fill="#ffe800" d="M0 0h640v240H0z"/>
        <path fill="#001489" d="M0 240h640v120H0z"/>
        <path fill="#da291c" d="M0 360h640v120H0z"/>
      </g>
    </svg>
  ),
  mx: (
    <svg viewBox="0 0 640 480" width="18" height="13" style={{ borderRadius: '2px', display: 'inline-block', verticalAlign: 'middle', boxShadow: '0 0 2px rgba(0,0,0,0.3)', flexShrink: 0 }}>
      <g fillRule="evenodd" strokeWidth="1pt">
        <path fill="#006847" d="M0 0h213.3v480H0z"/>
        <path fill="#ffffff" d="M213.3 0h213.4v480H213.3z"/>
        <path fill="#ce1126" d="M426.7 0H640v480H426.7z"/>
        <ellipse cx="320" cy="240" rx="24" ry="26" fill="#854d0e" />
        <ellipse cx="320" cy="240" rx="16" ry="18" fill="#15803d" />
      </g>
    </svg>
  ),
  us: (
    <svg viewBox="0 0 640 480" width="18" height="13" style={{ borderRadius: '2px', display: 'inline-block', verticalAlign: 'middle', boxShadow: '0 0 2px rgba(0,0,0,0.3)', flexShrink: 0 }}>
      <g fillRule="evenodd">
        <path fill="#b22234" d="M0 0h640v480H0z"/>
        <path stroke="#ffffff" strokeWidth="37" d="M0 55.4h640M0 129.2h640M0 203h640M0 277h640M0 350.8h640M0 424.6h640"/>
        <path fill="#3c3b6e" d="M0 0h256v258.5H0z"/>
      </g>
    </svg>
  )
};

export const getCountryCodeFromSede = (sede) => {
  if (!sede) return 'ec';
  const s = String(sede).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (s.includes('lima') || s.includes('peru') || s.includes('lim')) return 'pe';
  if (s.includes('quito') || s.includes('cuenca') || s.includes('guayaquil') || s.includes('uio') || s.includes('cue') || s.includes('gye') || s.includes('ecuador')) return 'ec';
  if (s.includes('medellin') || s.includes('med') || s.includes('colombia')) return 'co';
  if (s.includes('mex') || s.includes('cdmx')) return 'mx';
  return 'ec';
};

export default function CountryFlag({ sede, countryCode, style = {} }) {
  const code = countryCode || getCountryCodeFromSede(sede);
  const flagSvg = FLAGS[code] || FLAGS['ec'];
  
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: '6px', verticalAlign: 'middle', ...style }} title={sede || code?.toUpperCase()}>
      {flagSvg}
    </span>
  );
}
