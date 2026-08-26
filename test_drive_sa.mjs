import { readFileSync, writeFileSync } from 'fs';
import crypto from 'crypto';
import fetch from 'node-fetch';

const keyPath = "C:\\\\Users\\\\josem\\\\Downloads\\\\SO-AR\\\\centro-operativo-cpsl-65ad52160f45.json";
const sa = JSON.parse(readFileSync(keyPath, 'utf8'));

console.log("🔑 Usando Service Account:", sa.client_email);

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function getAccessToken(scopes) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: sa.client_email,
    scope: scopes.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaimSet = base64UrlEncode(JSON.stringify(claimSet));
  const signInput = `${encodedHeader}.${encodedClaimSet}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signInput);
  signer.end();
  const signature = signer.sign(sa.private_key, 'base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const jwt = `${signInput}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Error obteniendo access token: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function testDrive() {
  const token = await getAccessToken([
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/spreadsheets.readonly'
  ]);
  console.log("✅ Token de acceso obtenido con éxito!");

  // 1. Explorar carpeta de Drive: 1Wd-fJMe5LCk1gC6sxochbgg3QbAufDlk
  const folderId = '1Wd-fJMe5LCk1gC6sxochbgg3QbAufDlk';
  console.log(`\n📂 Explorando archivos dentro de la carpeta: ${folderId}...`);
  
  const driveUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,size,modifiedTime)&pageSize=100`;
  const driveRes = await fetch(driveUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const driveData = await driveRes.json();
  console.log("Drive API Response Status:", driveRes.status);
  
  if (driveData.files) {
    console.log(`🎉 ¡Total archivos encontrados en la carpeta: ${driveData.files.length}!`);
    driveData.files.forEach((f, i) => {
      console.log(`  ${i+1}. [${f.mimeType}] ${f.name} (id: ${f.id})`);
    });
    writeFileSync('drive_files_list.json', JSON.stringify(driveData, null, 2));
  } else {
    console.log("Respuesta de Drive:", driveData);
  }

  // 2. Probar acceso al Sheet de Maestría 1Qo7DIkJeS2yZcBLCV-nl5x-V_-g7Il--
  console.log("\n📊 Probando acceso al Sheet de Maestría...");
  const sheetId = '1Qo7DIkJeS2yZcBLCV-nl5x-V_-g7Il--';
  const sheetMetaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`;
  const sheetRes = await fetch(sheetMetaUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const sheetData = await sheetRes.json();
  if (sheetData.sheets) {
    console.log("✅ ¡Acceso exitoso al Google Sheet!");
    console.log("Pestañas disponibles:", sheetData.sheets.map(s => s.properties.title));
  } else {
    console.log("Respuesta de Sheets:", sheetData);
  }
}

testDrive().catch(console.error);
