import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { usersData } from '../data/usersData';
import { normalizeUserRecord, mergeUserRecords } from '../utils/userNormalizer';

export default function UserAuditReport({ onClose }) {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    const runAudit = async () => {
      try {
        setLoading(true);
        
        // 1. Obtener usuarios de Firestore
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        const firestoreUsers = [];
        snapshot.forEach(doc => firestoreUsers.push({ id: doc.id, ...doc.data() }));

        // 2. Normalizar usuarios de Firestore
        const normalizedFSUsers = firestoreUsers.map(u => normalizeUserRecord(u, 'firestore'));
        
        // 3. Normalizar usuarios estáticos (usersData.js)
        const normalizedStaticUsers = usersData.map(u => normalizeUserRecord(u, 'usersData'));

        // 4. Fusionar y detectar duplicados/inconsistencias
        const allUsersMap = new Map();
        const conflicts = [];
        let missingAuth = 0;

        // Primero cargar los de Firestore
        normalizedFSUsers.forEach(u => {
          allUsersMap.set(u.email, u);
          if (!u.uid) missingAuth++;
        });

        // Luego cruzar con los estáticos
        normalizedStaticUsers.forEach(staticU => {
          if (allUsersMap.has(staticU.email)) {
            const existing = allUsersMap.get(staticU.email);
            const merged = mergeUserRecords(existing, staticU);
            
            // Detectar si tenían roles distintos
            if (existing.role !== staticU.role) {
              conflicts.push(`Conflicto Rol: ${staticU.email} (FS: ${existing.role}, Static: ${staticU.role})`);
            }
            // Detectar si tenían sedes distintas
            if (existing.sede !== staticU.sede) {
              conflicts.push(`Conflicto Sede: ${staticU.email} (FS: ${existing.sede}, Static: ${staticU.sede})`);
            }

            allUsersMap.set(staticU.email, merged);
          } else {
            allUsersMap.set(staticU.email, staticU);
          }
        });

        const finalUsers = Array.from(allUsersMap.values());
        
        // Generar Markdown
        let md = `# REPORTE DE AUDITORÍA DE PERFILES DE USUARIO\n\n`;
        md += `Fecha de generación: ${new Date().toLocaleString()}\n\n`;
        
        md += `## Resumen del Inventario\n`;
        md += `- **Total de perfiles únicos (fusionados):** ${finalUsers.length}\n`;
        md += `- **Perfiles en Firestore:** ${firestoreUsers.length}\n`;
        md += `- **Perfiles en usersData.js:** ${usersData.length}\n`;
        md += `- **Perfiles en Firestore sin UID (sin Auth):** ${missingAuth}\n`;
        md += `- **Conflictos detectados:** ${conflicts.length}\n\n`;
        
        if (conflicts.length > 0) {
          md += `## Conflictos Detectados\n`;
          conflicts.forEach(c => { md += `- ${c}\n`; });
          md += `\n`;
        }

        md += `## Inventario Detallado\n\n`;
        md += `| Usuario | ID | Correos | Roles | Sede | Estado | Fuente |\n`;
        md += `|---|---|---|---|---|---|---|\n`;

        finalUsers.forEach(u => {
          const rolesStr = u.roles.join(', ');
          const emailsStr = u.emails.join(', ');
          md += `| ${u.name} | \`${u.id}\` | ${emailsStr} | ${rolesStr} | ${u.sede} | ${u.status} | ${u._source} |\n`;
        });

        setReportData(md);
        
      } catch (error) {
        console.error("Error running audit:", error);
        setReportData(`Error: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    runAudit();
  }, []);

  const downloadReport = () => {
    const blob = new Blob([reportData], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'USER_PROFILE_AUDIT_REPORT.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ backgroundColor: '#1e293b', width: '80%', height: '80%', padding: '20px', borderRadius: '10px', overflowY: 'auto', color: 'white', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', background: 'red', color: 'white', border: 'none', padding: '5px 10px', cursor: 'pointer', borderRadius: '5px' }}>Cerrar</button>
        <h2 style={{ color: '#29abe2' }}>Auditoría de Perfiles (Fase 1 y 2)</h2>
        
        {loading ? (
          <p>Extrayendo datos y normalizando perfiles. Por favor espera...</p>
        ) : (
          <div>
            <button onClick={downloadReport} style={{ background: '#29abe2', color: 'white', border: 'none', padding: '10px 15px', cursor: 'pointer', borderRadius: '5px', marginBottom: '20px', fontWeight: 'bold' }}>
              📥 Descargar Reporte Markdown
            </button>
            <pre style={{ background: '#0f172a', padding: '15px', borderRadius: '5px', overflowX: 'auto', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
              {reportData}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
