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
  "JULIO NARVAEZ": "JULIO CESAR NARVAEZ",
  "JULIO CESAR NARVAEZ": "JULIO CESAR NARVAEZ",
  "JULIO CESAR NARVAEZ MORA": "JULIO CESAR NARVAEZ",
  "JULIO NARVAEZ MORA": "JULIO CESAR NARVAEZ",
  "JULO CERSAR NAVAEZ": "JULIO CESAR NARVAEZ",
  "JULIO CERSAR NAVAEZ": "JULIO CESAR NARVAEZ",
  "JULO CESAR NARVAEZ": "JULIO CESAR NARVAEZ",
  "JULIO NAVAEZ": "JULIO CESAR NARVAEZ",
};

export const normalizeTrainerName = (rawName) => {
  if (!rawName) return "";
  // Eliminar prefijos de talleres/roles (ej. "CREACIÓN: ANDRÉS IDROBO" -> "ANDRÉS IDROBO", "RELACIÓN: ANDRÉS GÓMEZ" -> "ANDRÉS GÓMEZ")
  const stripped = rawName.replace(/^(?:CREACI[OÓ]N|RELACI[OÓ]N|IMPACTO(?:\s+RELACI[OÓ]N)?|CAP[IÍ]TULO\s+(?:UNO|DOS|TRES|CUATRO|[0-9]+)|MAESTR[IÍ]A(?:\s+DEL\s+JUEGO)?|COACH(?:ING)?|ENTRENADOR(?:A)?|FACILITADOR(?:A)?|L[IÍ]DER|STAFF|COORDINACI[OÓ]N)\s*:\s*/i, '').trim();
  const cleanName = stripped.toUpperCase().trim();
  return TRAINER_DICTIONARY[cleanName] || cleanName;
};
