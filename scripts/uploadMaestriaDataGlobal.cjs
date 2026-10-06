const fs = require('fs');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const rawServiceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!rawServiceAccount) {
  throw new Error('Falta GOOGLE_SERVICE_ACCOUNT_JSON para publicar datos de Maestría con permisos de backend.');
}
const serviceAccount = JSON.parse(rawServiceAccount);
const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

async function upload() {
    try {
        const data = JSON.parse(fs.readFileSync('spider_maestria_global.json', 'utf8'));
        await db.collection('nodus_kpis_sincronizados').doc('maestria_real_data').set({
            timestamp: new Date().toISOString(),
            equipos_lima: data // we keep the same object key for compatibility with my previous patch
        });
        console.log("Subida exitosa de maestria_real_data a Firestore (Global).");
        process.exit(0);
    } catch (err) {
        console.error("Error subiendo datos:", err);
        process.exit(1);
    }
}
upload();
