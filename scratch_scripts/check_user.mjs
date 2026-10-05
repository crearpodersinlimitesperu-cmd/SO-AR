// Consultar usuario jose.sanchez en Firestore via REST + firebase CLI token
import https from 'https';
import { execSync } from 'child_process';

// Get token from firebase CLI
const token = execSync('npx firebase --token 2>nul || echo ""', { encoding: 'utf8' }).trim();

// Use structured query via REST
const PROJECT_ID = 'centro-operativo-cpsl';

function firestoreQuery(collectionId, fieldPath, value) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath },
            op: 'EQUAL',
            value: { stringValue: value }
          }
        },
        limit: 5
      }
    });

    const options = {
      hostname: 'firestore.googleapis.com',
      path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('Consultando Firestore REST (sin auth, lectura publica de prueba)...\n');
  
  // Try the users collection  
  const result = await firestoreQuery('users', 'email', 'jose.sanchez@crearpsl.net');
  
  if (Array.isArray(result)) {
    for (const item of result) {
      if (item.document) {
        const fields = item.document.fields;
        console.log('=== USUARIO ENCONTRADO ===');
        console.log('Doc path:', item.document.name);
        
        for (const [key, val] of Object.entries(fields)) {
          if (val.stringValue !== undefined) console.log(`  ${key}: "${val.stringValue}"`);
          else if (val.arrayValue !== undefined) {
            const vals = (val.arrayValue.values || []).map(v => v.stringValue || JSON.stringify(v));
            console.log(`  ${key}: [${vals.join(', ')}]`);
          }
          else if (val.booleanValue !== undefined) console.log(`  ${key}: ${val.booleanValue}`);
          else console.log(`  ${key}: ${JSON.stringify(val)}`);
        }
      } else if (item.readTime) {
        // empty result
      } else {
        console.log('Item sin document:', JSON.stringify(item).slice(0, 200));
      }
    }
  } else {
    console.log('Respuesta:', typeof result === 'string' ? result.slice(0,500) : JSON.stringify(result).slice(0,500));
  }
}

main().catch(console.error);
