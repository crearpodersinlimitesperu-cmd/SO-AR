/**
 * Formatea y limpia cualquier número telefónico para abrir enlace directo a WhatsApp (wa.me)
 * Soporta códigos de país de Perú (+51), Ecuador (+593), Colombia (+57), México (+52)
 */
export function getWhatsAppUrl(phone, sede = '') {
  if (!phone) return null;
  let clean = String(phone).replace(/[^0-9]/g, '');
  if (!clean) return null;

  const normalizedSede = String(sede || '').toLowerCase();

  // Si ya tiene código de país internacional
  if (clean.startsWith('51') && clean.length === 11) {
    return `https://wa.me/${clean}`;
  }
  if (clean.startsWith('593') && (clean.length === 11 || clean.length === 12)) {
    return `https://wa.me/${clean}`;
  }
  if (clean.startsWith('57') && clean.length === 12) {
    return `https://wa.me/${clean}`;
  }
  if (clean.startsWith('52') && (clean.length === 12 || clean.length === 13)) {
    return `https://wa.me/${clean}`;
  }

  // Deducción inteligente por formato local o sede
  if (clean.length === 10 && clean.startsWith('09')) {
    // Ecuador (09XXXXXXXX -> 5939XXXXXXXX)
    clean = '593' + clean.substring(1);
  } else if (clean.length === 9 && clean.startsWith('9')) {
    // Si la sede es de Ecuador (Quito, Guayaquil, Cuenca)
    if (normalizedSede.includes('quito') || normalizedSede.includes('guayaquil') || normalizedSede.includes('cuenca') || normalizedSede.includes('ecuador')) {
      clean = '593' + clean;
    } else {
      // Por defecto 9 dígitos empezando en 9 = Perú (+51)
      clean = '51' + clean;
    }
  } else if (clean.length === 10 && (clean.startsWith('30') || clean.startsWith('31') || clean.startsWith('32') || clean.startsWith('35'))) {
    // Colombia
    clean = '57' + clean;
  } else if (clean.length === 10 && clean.startsWith('55')) {
    // México
    clean = '52' + clean;
  } else if (normalizedSede.includes('lima') || normalizedSede.includes('peru')) {
    if (!clean.startsWith('51')) clean = '51' + clean;
  } else if (normalizedSede.includes('quito') || normalizedSede.includes('guayaquil') || normalizedSede.includes('cuenca')) {
    if (!clean.startsWith('593')) clean = '593' + clean;
  } else if (normalizedSede.includes('medellin') || normalizedSede.includes('colombia')) {
    if (!clean.startsWith('57')) clean = '57' + clean;
  } else if (normalizedSede.includes('mexico')) {
    if (!clean.startsWith('52')) clean = '52' + clean;
  }

  return `https://wa.me/${clean}`;
}
