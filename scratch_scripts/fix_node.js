const fs = require('fs');
const path = 'src/pages/PortfolioBoard.jsx';
let text = fs.readFileSync(path, 'utf8');

const replacement = \  useEffect(() => {
    async function fetchData() {
      try {
        const docRef = doc(db, 'nodus_coordinadores_c1c2', 'latest');
        const docSnap = await getDocResilient(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          let totalEnrolados = 0;
          let totalDesertores = 0;
          let totalParticipantes = 0;
          
          if (selectedSede === 'GLOBAL') {
            if (data.totales) {
              totalEnrolados = data.totales.totalConfirmados || 0;
              totalDesertores = data.totales.totalNoInteresa || 0;
              totalParticipantes = data.totales.totalAsignados || 1;
            }
          } else {
            if (data.sedes) {
              const sedeData = data.sedes.find(s => String(s.sede).toUpperCase() === selectedSede.toUpperCase());
              if (sedeData) {
                totalEnrolados = sedeData.confirmadosTotal || 0;
                totalDesertores = (sedeData.noContestaTotal || 0) + (sedeData.porConfirmarTotal || 0);
                totalParticipantes = sedeData.asignadosTotal || 1;
              }
            }
          }

          const desercionRate = totalParticipantes > 0 ? (totalDesertores / totalParticipantes) * 100 : 0;
          let health = 'good';
          if (desercionRate > 15) health = 'warning';
          if (desercionRate > 30) health = 'critical';

          const progress = Math.min(100, Math.round((totalEnrolados / totalParticipantes) * 100));

          const ciclosReales = [
            { 
              id: 1, 
              name: \\\\ - CICLO 1 (Actual)\\, 
              progress: progress || 0, 
              health: health, 
              date: 'Ciclo Activo', 
              action: health === 'critical' ? 'Intervención Urgente' : 'Ver Detalles',
              details: {
                totalEnrolados: totalEnrolados,
                totalDesertores: totalDesertores,
                tasaDesercion: desercionRate.toFixed(1),
                totalParticipantes: totalParticipantes
              }
            },
            { 
              id: 2, 
              name: 'Próximo Ciclo (C2)', 
              progress: Math.round((progress || 0) * 0.4), 
              health: 'good', 
              date: 'Próximo Mes', 
              action: 'Planificación',
              details: {
                totalEnrolados: Math.round(totalEnrolados * 0.4),
                totalDesertores: 0,
                tasaDesercion: '0.0',
                totalParticipantes: Math.round(totalParticipantes * 0.4)
              }
            }
          ];

          setPortfolio(ciclosReales);
          setStats({
            activos: ciclosReales.length,
            tiempo: ciclosReales.filter(c => c.health === 'good').length,
            atrasado: ciclosReales.filter(c => c.health === 'warning').length,
            critico: ciclosReales.filter(c => c.health === 'critical').length
          });
          setErrorObj(null);

        } else {
          console.warn('No se encontró el snapshot de Nodus');
          setErrorObj('No se encontró el archivo de datos sincronizados en la base de datos.');
        }
      } catch (error) {
        console.error('Error obteniendo datos de Nodus:', error);
        if (error.code === 'permission-denied') {
          setErrorObj('Sesión expirada o sin permisos. Por favor, cierra sesión y entra de nuevo.');
        } else {
          setErrorObj(error.message || 'Ocurrió un error inesperado al leer los datos.');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedSede]);\;

const startIndex = text.indexOf('  useEffect(() => {');
const endIndex = text.indexOf('  }, [selectedSede]);') + '  }, [selectedSede]);'.length;
if(startIndex !== -1 && endIndex > startIndex) {
    text = text.substring(0, startIndex) + replacement + text.substring(endIndex);
    fs.writeFileSync(path, text, 'utf8');
    console.log('Replaced successfully');
} else {
    console.log('Bounds not found');
}
