const fs = require('fs');

const path = 'src/pages/EmbudoConversionBoard.jsx';
let code = fs.readFileSync(path, 'utf8');

// Replace the static state and the setEquiposDisponibles logic
code = code.replace(/const \[equiposDisponibles, setEquiposDisponibles\] = useState\([\s\S]*?\);/, '');
code = code.replace(/if \(uniqueEquipos\.length > 0\) \{[\s\S]*?setEquiposDisponibles\(\[\.\.\.uniqueEquipos, 'TODOS'\]\);[\s\S]*?\}/, '');

// Inject the useMemo hook just after selectedSede
const hookInjection = `
  const equiposDisponibles = React.useMemo(() => {
    if (!snapshotData?.secciones?.reporteAsistenciaPorEquipo) {
      return ['EQUIPO 30', 'EQUIPO 29', 'EQUIPO 28', 'EQUIPO 27', 'TODOS'];
    }
    const keys = Object.keys(snapshotData.secciones.reporteAsistenciaPorEquipo);
    // Filtrar llaves que correspondan a la sede actual
    const sedeKeys = keys.filter(k => k.toUpperCase().includes(selectedSede.toUpperCase()));
    
    // Si la sede no tiene equipos en la data, evitamos crashear y mostramos TODOS o vacío
    const validKeys = sedeKeys.length > 0 ? sedeKeys : keys;
    
    const eqs = validKeys.map(k => {
      const match = k.match(/EQUIPO\s+\d+/i);
      return match ? match[0].toUpperCase() : null;
    }).filter(Boolean);
    
    const unique = Array.from(new Set(eqs));
    return unique.length > 0 ? [...unique, 'TODOS'] : ['TODOS'];
  }, [snapshotData, selectedSede]);

  React.useEffect(() => {
    if (equiposDisponibles.length > 0 && !equiposDisponibles.includes(selectedEquipo) && selectedEquipo !== 'TODOS') {
      setSelectedEquipo(equiposDisponibles[0]);
    }
  }, [equiposDisponibles, selectedEquipo]);
`;

code = code.replace(/const \[selectedEquipo, setSelectedEquipo\] = useState\('EQUIPO 30'\);/, `const [selectedEquipo, setSelectedEquipo] = useState('EQUIPO 30');\n${hookInjection}`);

fs.writeFileSync(path, code);
