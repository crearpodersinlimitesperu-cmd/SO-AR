import React, { useState } from 'react';
import { db } from '../services/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { INITIAL_MANAGERS } from '../data/managersData';
import { USERS_TO_IMPORT } from '../data/usersToImport';

export default function DataMigrator({ onClose }) {
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState('');

  const appendLog = (msg) => setLog(prev => prev + msg + '\n');

  const runMigration = async () => {
    try {
      setLoading(true);
      appendLog('Iniciando migración de datos sensibles a Firestore...');

      // 1. Migrar Managers
      appendLog(`Migrando ${INITIAL_MANAGERS.length} managers...`);
      let mCount = 0;
      for (const manager of INITIAL_MANAGERS) {
        const id = manager.id ? String(manager.id) : `manager_${Date.now()}_${Math.random()}`;
        await setDoc(doc(db, 'managers_directory', id), manager);
        mCount++;
      }
      appendLog(`✅ ${mCount} managers migrados exitosamente.`);

      // 2. Migrar Staff
      appendLog(`Migrando ${USERS_TO_IMPORT.length} miembros del staff...`);
      let sCount = 0;
      for (const staff of USERS_TO_IMPORT) {
        const id = staff.id || `staff_${Date.now()}_${Math.random()}`;
        await setDoc(doc(db, 'staff_directory', id), staff);
        sCount++;
      }
      appendLog(`✅ ${sCount} miembros del staff migrados exitosamente.`);

      appendLog('\n🎉 MIGRACIÓN COMPLETADA. Ahora el desarrollador puede vaciar los archivos .js');
    } catch (error) {
      appendLog(`❌ ERROR: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ backgroundColor: '#1e293b', width: '80%', height: '80%', padding: '20px', borderRadius: '10px', overflowY: 'auto', color: 'white', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', background: 'red', color: 'white', border: 'none', padding: '5px 10px', cursor: 'pointer', borderRadius: '5px' }}>Cerrar</button>
        <h2 style={{ color: '#f59e0b' }}>⚠️ Migración de Datos Sensibles (Hito 0)</h2>
        <p>Este proceso moverá los datos harcodeados (Managers y Staff) hacia Firestore para protegerlos.</p>
        
        <button 
          onClick={runMigration} 
          disabled={loading}
          style={{ background: '#f59e0b', color: 'black', border: 'none', padding: '10px 15px', cursor: 'pointer', borderRadius: '5px', marginBottom: '20px', fontWeight: 'bold' }}>
          {loading ? 'Migrando...' : '🚀 Ejecutar Migración Ahora'}
        </button>
        
        <pre style={{ background: '#0f172a', padding: '15px', borderRadius: '5px', overflowX: 'auto', fontSize: '0.9rem', whiteSpace: 'pre-wrap', minHeight: '300px' }}>
          {log || "Esperando inicio..."}
        </pre>
      </div>
    </div>
  );
}
