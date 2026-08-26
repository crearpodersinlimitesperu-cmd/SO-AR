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
  "Andrs Gmez": "Andres Gomez",
  "Andrés Gómez": "Andres Gomez",
  "Andres Gomez": "Andres Gomez",
  "Andrs Idrobo": "Andres Idrobo",
  "Andrés Idrobo": "Andres Idrobo",
  "Andres Idrobo": "Andres Idrobo",
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
  "Julio Narvez": "Julio Narvaez",
  "Julio Narvaez": "Julio Narvaez",
  "Julio Narváez": "Julio Narvaez",
  "Kerlie Carrillo": "Kerly Carrillo",
  "Kerly Carrillo": "Kerly Carrillo",
  "Kerly Carrillo Garzon": "Kerly Carrillo",
  "Lourdes Patio": "Lourdes Patino",
  "Lourdes Patino": "Lourdes Patino",
  "Maria de Lourdes Patino Galarraga": "Lourdes Patino",
  "María de Lourdes Patiño": "Lourdes Patino",
  "Maurcio Ramirez": "Mauricio Ramirez",
  "Mauricio Ramrez": "Mauricio Ramirez",
  "Mauricio Ramirez": "Mauricio Ramirez",
  "Mauricio Ramírez": "Mauricio Ramirez",
  "Mildred Munoz Vasquez": "Mildred Munoz",
  "Mildred Munoz": "Mildred Munoz",
  "Mildred Muñoz": "Mildred Munoz",
  "Isaac Betancourth": "Isaac Betancourt",
  "Isaac Betancourt": "Isaac Betancourt",
  "Juan Fer Reinoso": "Juan Fernando Reinoso",
  "Juan Fernando Reinoso": "Juan Fernando Reinoso"
};
  return map[clean] || clean;
};

export const normalizeCoordinator = (name) => {
  if (!name) return '';
  const clean = name.trim();
  const map = {
  "ISAAC BETANCOURTH": "ISAAC BETANCOURT",
  "JOSU VERA": "JOSUE VERA",
  "JUAN FER REINOSO": "JUAN FERNANDO REINOSO",
  "KERLY CARRILLO - JUANFER REINOSO": "KERLY CARRILLO / JUAN FERNANDO REINOSO",
  "KERLY CARRILLO / JUANFER REINOSO": "KERLY CARRILLO / JUAN FERNANDO REINOSO"
};
  return map[clean] || clean;
};
