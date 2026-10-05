// Catálogo y Diccionario Canónico de Entrenadores Oficiales de Causa OS
// Normalización de nombres de cronograma (Sheets/Causa) hacia su nombre oficial legal.

export const normalizarIdentidadEntrenador = (value = '') => String(value)
  .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
  .map(token => ({ fernando: 'fer', fer: 'fer', erica: 'erika' }[token] || token))
  .join(' ');

export const NOMBRES_LEGALES_ENTRENADORES = {
  'alejandro diaz': 'Alejandro Díaz',
  'alonso solares': 'Alonso Solares Salazar',
  'alonso solares salazar': 'Alonso Solares Salazar',
  'ana elena monroy': 'Ana Elena Monroy',
  'ana elena monroy thompson': 'Ana Elena Monroy',
  'ana monroy': 'Ana Elena Monroy',
  'andres gomez': 'Andrés Gómez',
  'andres i': 'Andrés Idrobo',
  'andres idrobo': 'Andrés Idrobo',
  'carlos brunis': 'Carlos Brunis',
  'chuy acosta': 'Jesús Adrián Acosta',
  'cirilo agustin': 'Cirilo Agustín Martínez',
  'cirilo agustin martinez': 'Cirilo Agustín Martínez',
  'diego bravo': 'Diego Bravo',
  'diego david bravo figueroa': 'Diego Bravo',
  'edison paul sosa': 'Paul Sosa',
  'edison paul sosa carrera': 'Paul Sosa',
  'elmer andres idrobo andrade': 'Andrés Idrobo',
  'erica gavilanez': 'Erika Gissell Gavilánez Gallardo',
  'erica gavilanes': 'Erika Gissell Gavilánez Gallardo',
  'erika gavilanez': 'Erika Gissell Gavilánez Gallardo',
  'erika gavilanes': 'Erika Gissell Gavilánez Gallardo',
  'erika gissell gavilanez gallardo': 'Erika Gissell Gavilánez Gallardo',
  'erika gissell gavilanes gallardo': 'Erika Gissell Gavilánez Gallardo',
  'erica gissell gavilanez gallardo': 'Erika Gissell Gavilánez Gallardo',
  'ernesto alejandro diaz pabon': 'Alejandro Díaz',
  'fer aragon': 'Fer Aragón',
  'fer mendoza': 'Haydin Fernando Mendoza Clavijo',
  'fernando aragon': 'Fer Aragón',
  'haydin fer mendoza clavijo': 'Haydin Fernando Mendoza Clavijo',
  'haydin fernando mendoza clavijo': 'Haydin Fernando Mendoza Clavijo',
  'jesus acosta': 'Jesús Adrián Acosta',
  'jesus adrian acosta': 'Jesús Adrián Acosta',
  'jose sanchez': 'José Sánchez',
  'josue vera': 'Marcos Josué Vera Avilés',
  'juan angel': 'Juan Angel',
  'juan angel arreola': 'Juan Angel',
  'juan angel arreola morales': 'Juan Angel',
  'julio cesar narvaez': 'Julio César Narváez',
  'julio narvaez': 'Julio César Narváez',
  'leandro brunis': 'Leandro Brunis',
  'lili cubillo': 'Liliana Lilibeth Cubillo Vera',
  'liliana cubillo': 'Liliana Lilibeth Cubillo Vera',
  'linid valencia': 'Linid Valencia',
  'lourdes patino': 'María De Lourdes Patiño Patiño Galarraga',
  'marcos josue vera aviles': 'Marcos Josué Vera Avilés',
  'maria de lourdes patino': 'María De Lourdes Patiño Patiño Galarraga',
  'maria de lourdes patino galarraga': 'María De Lourdes Patiño Patiño Galarraga',
  'maria de lourdes patino patino galarraga': 'María De Lourdes Patiño Patiño Galarraga',
  'mary lourdes patino': 'María De Lourdes Patiño Patiño Galarraga',
  'mau perez': 'Mauricio Pérez',
  'mauricio perez': 'Mauricio Pérez',
  'mauricio ramirez': 'Mauricio Ramirez Silva',
  'mauricio ramirez silva': 'Mauricio Ramirez Silva',
  'michael boada': 'Mike Boada',
  'mike boada': 'Mike Boada',
  'mildred munoz': 'Mildred Muñoz Vasquez',
  'mildred munoz v': 'Mildred Muñoz Vasquez',
  'mildred munoz vasquez': 'Mildred Muñoz Vasquez',
  'paul sosa': 'Paul Sosa',
  'regi romero': 'Judith Regina Romero Rosales',
  'regina romero': 'Judith Regina Romero Rosales',
};

export const nombreLegalEntrenador = (value = '') => {
  if (!value) return '';
  const raw = String(value).trim();
  const identity = normalizarIdentidadEntrenador(raw);
  return NOMBRES_LEGALES_ENTRENADORES[identity] || raw;
};

export const formatTrainerDisplayName = (trainerStr = '') => {
  if (!trainerStr) return '';
  return String(trainerStr)
    .split(/[,/&•]+/)
    .map(t => nombreLegalEntrenador(t.trim()))
    .filter(Boolean)
    .join(' / ');
};
