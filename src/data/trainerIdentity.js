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
  "Erika Gavilnez": "Erika Gissell Gavilanez Gallardo",
  "Erika Gavilanez": "Erika Gissell Gavilanez Gallardo",
  "Erika Gavilánez": "Erika Gissell Gavilanez Gallardo",
  "Érika Gavilánez": "Erika Gissell Gavilanez Gallardo",
  "Erika Gavilanes": "Erika Gissell Gavilanez Gallardo",
  "Erika Gavilánes": "Erika Gissell Gavilanez Gallardo",
  "Erica Gavilanez": "Erika Gissell Gavilanez Gallardo",
  "Erica Gavilanes": "Erika Gissell Gavilanez Gallardo",
  "Erica Gavilánez": "Erika Gissell Gavilanez Gallardo",
  "Erica Gavilánes": "Erika Gissell Gavilanez Gallardo",
  "Erika Gissell Gavilanez Gallardo": "Erika Gissell Gavilanez Gallardo",
  "Erika Gissell Gavilanes Gallardo": "Erika Gissell Gavilanez Gallardo",
  "Erica Gissell Gavilanez Gallardo": "Erika Gissell Gavilanez Gallardo",
  "Erica Gissell Gavilanes Gallardo": "Erika Gissell Gavilanez Gallardo",
  "Jos Snchez": "Jose Luis Sanchez Moreno",
  "José Sánchez": "Jose Luis Sanchez Moreno",
  "Jose Sanchez": "Jose Luis Sanchez Moreno",
  "Josu Vera": "Josue Vera",
  "Josue Vera": "Josue Vera",
  "Josué Vera": "Josue Vera",
  "Marcos Vera": "Josue Vera",
  "Marcos Josue Vera": "Josue Vera",
  "Julio Narvez": "Julio Narvaez",
  "Julio Narvaez": "Julio Narvaez",
  "Julio Narváez": "Julio Narvaez",
  "Kerlie Carrillo": "Kerly Carrillo Garzon",
  "Kerly Carrillo": "Kerly Carrillo Garzon",
  "Kerly Carrillo Garzon": "Kerly Carrillo Garzon",
  "Lourdes Patio": "María De Lourdes Patiño Galarraga",
  "Lourdes Patino": "María De Lourdes Patiño Galarraga",
  "Lourdes Patiño": "María De Lourdes Patiño Galarraga",
  "Maria de Lourdes Patino Galarraga": "María De Lourdes Patiño Galarraga",
  "María de Lourdes Patiño": "María De Lourdes Patiño Galarraga",
  "María De Lourdes Patiño Galarraga": "María De Lourdes Patiño Galarraga",
  "Maurcio Ramirez": "Mauricio Ramirez Silva",
  "Mauricio Ramrez": "Mauricio Ramirez Silva",
  "Mauricio Ramirez": "Mauricio Ramirez Silva",
  "Mauricio Ramírez": "Mauricio Ramirez Silva",
  "Mila Campuzano": "Mila Campuzano",
  "Emily Campuzano": "Mila Campuzano",
  "Emily Gabriela Campuzano Rodríguez": "Mila Campuzano",
  "Emily Gabriela Campuzano Rodrguez": "Mila Campuzano",
  "Emily Gabriela Campuzano Rodriguez": "Mila Campuzano",
  "Mildred Munoz Vasquez": "Mildred Munoz",
  "Mildred Munoz": "Mildred Munoz",
  "Mildred Muñoz": "Mildred Munoz",
  "Isaac Betancourth": "Isaac Gabriel Betancourt Patino",
  "Isaac Betancourt": "Isaac Gabriel Betancourt Patino",
  "Juan Fer Reinoso": "Juan Fernando Reinoso",
  "Juan Fernando Reinoso": "Juan Fernando Reinoso",
  "Daniela Monroy": "Daniela Monroy Fabbri",
  "Daniela Monroy Fabbri": "Daniela Monroy Fabbri",
  "Fernando Mendoza": "Haydin Fernando Mendoza Clavijo",
  "Fer Mendoza": "Haydin Fernando Mendoza Clavijo",
  "Haydin Fernando Mendoza Clavijo": "Haydin Fernando Mendoza Clavijo",
  "Jonathan La Rosa": "Jonathan Alexander La Rosa Nieto",
  "Jonathan Alexander La Rosa Nieto": "Jonathan Alexander La Rosa Nieto",
  "Leyla Pasquel": "Leyla Kelly Pasquel Alfaro",
  "Leyla Kelly Pasquel Alfaro": "Leyla Kelly Pasquel Alfaro",
  "Lili Cubillo": "Lili Cubillo",
  "Liliana Cubillo": "Lili Cubillo",
  "Lilibeth Cubillo": "Lili Cubillo",
  "Liliana Lilibeth Cubillo Vera": "Lili Cubillo",
  "Regina Romero": "Regina Romero",
  "Regi Romero": "Regina Romero",
  "Judith Regina Romero Rosales": "Regina Romero",
  "Judith Romero": "Regina Romero",
  "Diego Bravo": "Diego David Bravo Figueroa",
  "Diego David Bravo Figueroa": "Diego David Bravo Figueroa",
  // CONTEXTO (28/08/2026): José indicó que a Fredy Sosa le gusta que le digan
  // David Sosa, y a Edison Paul Sosa le gusta que le digan Paul Sosa. En los
  // datos actuales de managersData.js ya se usa "David Sosa" y "Paul Sosa" en
  // todos lados (no aparece ningún registro con el nombre legal) — se agregan
  // estos alias solo de forma preventiva, por si una futura carga/importación
  // llega con el nombre legal, para que no se cree un entrenador duplicado.
  "Fredy Sosa": "David Sosa",
  "David Sosa": "David Sosa",
  "Edison Paul Sosa": "Paul Sosa",
  "Paul Sosa": "Paul Sosa",
  // Ex-colaboradores desvinculados (Directiva: José Sánchez)
  "Ana Cristina Sanchez": "Ana Cristina Sanchez",
  "Ana Cristina Sánchez": "Ana Cristina Sanchez",
  "Christian Tito": "Christian Tito",
  "Jose Torron": "Jose Torron",
  "José Torrón": "Jose Torron",
  "Kriscia Rodas": "Kriscia Rodas",
  "Kriscia Liszet Rodas Quispe": "Kriscia Rodas",
  "Kriscia Quispe": "Kriscia Rodas",
  "Maria Jose Roman": "Maria Jose Roman",
  "María José Román": "Maria Jose Roman",
  "Maria Jose Román": "Maria Jose Roman",
  "Pamela Carrillo": "Pamela Carrillo"
};
  if (map[clean]) return map[clean];

  // (02/09/2026) Fallback insensible a mayúsculas/acentos/espacios — antes de esto,
  // normalizeTrainer solo hacía match EXACTO de string contra el mapa de arriba, así
  // que cualquier variante de mayúsculas/acentos que no estuviera enumerada a mano
  // (ej. "DANIELA MONROY" en vez de "Daniela Monroy", "Erika Gavilánez" con una
  // combinación de acentos distinta a las ya listadas) se trataba como un
  // entrenador DIFERENTE y aparecía duplicado en las tarjetas de equipo (reportado
  // por José con varios ejemplos reales: Erika, Lourdes Patiño, Daniela Monroy).
  // Este fallback compara la entrada contra cada clave del mapa ya normalizada
  // (sin acentos, en minúsculas, espacios colapsados), sin tener que seguir
  // enumerando cada combinación posible a mano.
  const foldKey = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const foldedClean = foldKey(clean);
  for (const key in map) {
    if (foldKey(key) === foldedClean) return map[key];
  }
  return clean;
};

// Personal que ya no forma parte de Crear (Desvinculados / Inactivos)
// Directiva explícita de José Sánchez: No deben ser asignables y solo son visibles para José y Talento Humano
export const ENTRENADORES_INACTIVOS_LIST = [
  "Ana Cristina Sanchez",
  "Christian Tito",
  "Jose Torron",
  "Kriscia Rodas",
  "Maria Jose Roman",
  "Pamela Carrillo"
];

export const isInactiveTrainer = (name) => {
  if (!name) return false;
  const foldKey = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const folded = foldKey(normalizeTrainer(name) || name);
  return ENTRENADORES_INACTIVOS_LIST.some(inactive => foldKey(inactive) === folded);
};

