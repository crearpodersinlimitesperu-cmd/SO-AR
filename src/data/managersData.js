// Datos migrados a Firestore (managers_directory) en el Hito 0 por seguridad.
export const INITIAL_MANAGERS = [];
export const INITIAL_LLAMADOS = [];
export const ENTRENADORES_LIST = [];
export const COORDINADORES_LIST = [];
export const TRAINER_METADATA = {};

export const normalizeTrainer = (name) => {
  if (!name) return '';
  const clean = name.trim();
  const map = {
  "Carlos Brunis": "Carlos Brunis",
  "Leandro Brunis": "Leandro Brunis",
  "Andres Gomez": "Andres Gomez",
  "Andrs Gmez": "Andres Gomez",
  "Andrés Gómez": "Andres Gomez",
  "Andres Idrobo": "Andres Idrobo",
  "Andrs Idrobo": "Andres Idrobo",
  "Andrés Idrobo": "Andres Idrobo",
  "Ana Elena Monroy": "Ana Monroy",
  "Ana Monroy": "Ana Monroy",
  "Alonso Solares Salazar": "Alonso Solares",
  "Alonso Solares": "Alonso Solares",
  "Chuy Acosta": "Jesus Adrian Acosta",
  "Jesus Acosta": "Jesus Adrian Acosta",
  "Jesus Adrian Acosta": "Jesus Adrian Acosta",
  "Jesús Acosta": "Jesus Adrian Acosta",
  "Jesús Adrián Acosta": "Jesus Adrian Acosta",
  "Erika Gavilnez": "Erika Gavilanez",
  "Erika Gavilanez": "Erika Gavilanez",
  "Érika Gavilánez": "Erika Gavilanez",
  "Jos Snchez": "Jose Sanchez",
  "José Sánchez": "Jose Sanchez",
  "Jose Sanchez": "Jose Sanchez",
  "Josu Vera": "Josue Vera",
  "Josue Vera": "Josue Vera",
  "Josué Vera": "Josue Vera",
  };
  return map[clean] || clean;
};

export const normalizeCoordinator = (name) => {
  if (!name) return '';
  return name.trim();
};
