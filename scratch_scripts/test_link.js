function generarLink(sede, equipo) {
  let sedeStr = sede === 'todos' ? 'SEDE' : sede.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, '');
  let eqStr = 'EQUIPO';
  const match = equipo.match(/\d+/);
  if (match) {
    eqStr = 'e' + match[0];
  } else if (equipo !== 'todos') {
    eqStr = equipo.replace(/\s+/g, '').toLowerCase();
  }
  return `https://crearpsl.net/imos${eqStr}${sedeStr}/`;
}

console.log(generarLink('Lima', 'C1E30'));
