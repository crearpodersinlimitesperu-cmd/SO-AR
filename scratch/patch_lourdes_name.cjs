const fs = require('fs');
let code = fs.readFileSync('src/data/managersData.js', 'utf8');

// Update ENTRENADORES_LIST
code = code.replace(
  '"Lourdes Patino",',
  '"María De Lourdes Patiño Galarraga",'
);

// Update TRAINER_METADATA
code = code.replace(
  '"Maria de Lourdes Patino Galarraga": {',
  '"María De Lourdes Patiño Galarraga": {'
);

// Update normalizeTrainer map
code = code.replace(
  /"Lourdes Patio": "Lourdes Patino",/g,
  '"Lourdes Patio": "María De Lourdes Patiño Galarraga",'
);
code = code.replace(
  /"Lourdes Patino": "Lourdes Patino",/g,
  '"Lourdes Patino": "María De Lourdes Patiño Galarraga",'
);
code = code.replace(
  /"Maria de Lourdes Patino Galarraga": "Lourdes Patino",/g,
  '"Maria de Lourdes Patino Galarraga": "María De Lourdes Patiño Galarraga",'
);
code = code.replace(
  /"Mara de Lourdes Patio": "Lourdes Patino",/g,
  '"Mara de Lourdes Patio": "María De Lourdes Patiño Galarraga",'
);
code = code.replace(
  /"María de Lourdes Patiño": "Lourdes Patino",/g,
  '"María de Lourdes Patiño": "María De Lourdes Patiño Galarraga",'
);
code = code.replace(
  /"María De Lourdes Patiño Galarraga": "Lourdes Patino",/g,
  '"María De Lourdes Patiño Galarraga": "María De Lourdes Patiño Galarraga",'
);

fs.writeFileSync('src/data/managersData.js', code, 'utf8');
