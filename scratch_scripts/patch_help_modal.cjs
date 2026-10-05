const fs = require('fs');
const path = 'src/components/HelpModal.jsx';
let code = fs.readFileSync(path, 'utf8');

const target = `      await addDoc(collection(db, 'sugerencias_soporte'), {
        userId: currentUser?.uid || '',
        userName: currentUser?.name || currentUser?.displayName || 'Usuario Causa OS',
        userEmail: currentUser?.email || '',
        userRole: currentUser?.appRole || currentUser?.role || 'miembro',
        userSede: currentUser?.sede || 'Global',
        suggestion: suggestion.trim(),
        imageUrl: imageUrl || '',
        status: 'Pendiente', // 'Pendiente' | 'En Revisión' | 'Resuelto'
        createdAt: serverTimestamp(),
        createdAtIso: new Date().toISOString()
      });`;

const replacement = `      try {
        await addDoc(collection(db, 'sugerencias_soporte'), {
          userId: currentUser?.uid || '',
          userName: currentUser?.name || currentUser?.displayName || 'Usuario Causa OS',
          userEmail: currentUser?.email || '',
          userRole: currentUser?.appRole || currentUser?.role || 'miembro',
          userSede: currentUser?.sede || 'Global',
          suggestion: suggestion.trim(),
          imageUrl: imageUrl || '',
          status: 'Pendiente', 
          createdAt: serverTimestamp(),
          createdAtIso: new Date().toISOString()
        });
      } catch (err) {
        console.warn("No se pudo guardar en sugerencias_soporte (posible falta de regla), continuando con el envío de correo...", err);
      }`;

code = code.replace(target, replacement);
fs.writeFileSync(path, code);
