// src/data/sedesPricingData.js
// Tarifario Oficial de FDS Capítulo 1 por Sede para Proyecciones de Recaudación Financiera

export const SEDES_FDS_PRICING = {
  Lima: {
    sede: 'Lima',
    pais: 'Perú',
    moneda: 'PEN',
    simbolo: 'S/.',
    nombreMoneda: 'Soles',
    precioFdsC1: 900, // Confirmado: 900 soles
    precioFdsC1Label: 'S/. 900 PEN',
    tasaCambioUSD: 3.75, // Referencia para consolidación global en USD
  },
  Quito: {
    sede: 'Quito',
    pais: 'Ecuador',
    moneda: 'USD',
    simbolo: '$',
    nombreMoneda: 'Dólares',
    precioFdsC1: 250,
    precioFdsC1Label: '$250 USD',
    tasaCambioUSD: 1.0,
  },
  Cuenca: {
    sede: 'Cuenca',
    pais: 'Ecuador',
    moneda: 'USD',
    simbolo: '$',
    nombreMoneda: 'Dólares',
    precioFdsC1: 250,
    precioFdsC1Label: '$250 USD',
    tasaCambioUSD: 1.0,
  },
  Guayaquil: {
    sede: 'Guayaquil',
    pais: 'Ecuador',
    moneda: 'USD',
    simbolo: '$',
    nombreMoneda: 'Dólares',
    precioFdsC1: 250,
    precioFdsC1Label: '$250 USD',
    tasaCambioUSD: 1.0,
  },
  Medellín: {
    sede: 'Medellín',
    pais: 'Colombia',
    moneda: 'COP',
    simbolo: '$',
    nombreMoneda: 'Pesos Colombianos',
    precioFdsC1: 1100000,
    precioFdsC1Label: '$1,100,000 COP',
    tasaCambioUSD: 4200,
  },
  México: {
    sede: 'México',
    pais: 'México',
    moneda: 'MXN',
    simbolo: '$',
    nombreMoneda: 'Pesos Mexicanos',
    precioFdsC1: 4900,
    precioFdsC1Label: '$4,900 MXN',
    tasaCambioUSD: 19.5,
  }
};

/**
 * Obtiene la configuración de precios para una sede, con soporte de normalización y overrides personalizados
 */
export function getSedePricing(sedeName, customOverrides = null) {
  if (!sedeName) return SEDES_FDS_PRICING['Lima'];
  
  const s = sedeName.toString().trim();
  const clean = s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  let basePricing = SEDES_FDS_PRICING['Lima'];

  if (clean.includes('lima')) basePricing = SEDES_FDS_PRICING['Lima'];
  else if (clean.includes('quito')) basePricing = SEDES_FDS_PRICING['Quito'];
  else if (clean.includes('cuenca')) basePricing = SEDES_FDS_PRICING['Cuenca'];
  else if (clean.includes('guayaquil') || clean === 'gye') basePricing = SEDES_FDS_PRICING['Guayaquil'];
  else if (clean.includes('medell')) basePricing = SEDES_FDS_PRICING['Medellín'];
  else if (clean.includes('mex') || clean.includes('cdmx')) basePricing = SEDES_FDS_PRICING['México'];
  
  if (customOverrides && customOverrides[basePricing.sede]) {
    return {
      ...basePricing,
      ...customOverrides[basePricing.sede]
    };
  }

  return basePricing;
}

/**
 * Formatea un monto con su símbolo y código de divisa
 */
export function formatCurrencyAmount(amount, moneda = 'USD', simbolo = '$') {
  if (amount === undefined || amount === null || isNaN(amount)) return `${simbolo}0 ${moneda}`;
  return `${simbolo}${Math.round(amount).toLocaleString('en-US')} ${moneda}`;
}
