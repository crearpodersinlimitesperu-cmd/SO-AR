// Diccionario Maestro de Identidades de Entrenadores (Trainer Identity Normalizer)
// Sello de Causa: Regla de Fidelidad de Datos. NO ALUCINAR.
// Este diccionario fusiona nombres variantes o incompletos provenientes del calendario
// hacia su identidad única, oficial y canónica para evitar duplicidad de tarjetas en la interfaz de capacidad.

export const TRAINER_DICTIONARY = {
  // Alias / Variante en Calendario -> Nombre Canónico
  "ANA MONROY": "ANA ELENA MONROY THOMPSON",
  "ANA ELENA MONROY": "ANA ELENA MONROY THOMPSON",
  "JUAN ANGEL ARREOLA": "JUAN ANGEL ARREOLA MORALES",
  "JOSE LUIS SANCHEZ": "JOSE SANCHEZ",
  "JOSE LUIS": "JOSE SANCHEZ", // Cuidado con colisiones, se recomienda mapeos más exactos.
};

export const normalizeTrainerName = (rawName) => {
  if (!rawName) return "";
  const cleanName = rawName.toUpperCase().trim();
  return TRAINER_DICTIONARY[cleanName] || cleanName;
};
