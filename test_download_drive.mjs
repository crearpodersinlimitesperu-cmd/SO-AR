import { readFileSync, writeFileSync } from 'fs';
import crypto from 'crypto';
import fetch from 'node-fetch';
import openpyxl from 'child_process';

const keyPath = "C:\\Users\\josem\\Downloads\\centro-operativo-cpsl-65ad52160f45.json";
const sa = JSON.parse(readFileSync(keyPath, 'utf8'));

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
  return data.access_token;
}

async function testDownloadFile() {
  const token = await getAccessToken([
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/spreadsheets.readonly'
  ]);

  // 1. Probar descarga de archivo Excel desde Drive
  const excelId = '1Qo7DIkJeS2yZcBLCV-nl5x-V_-g7Il--';
  console.log(`\n📥 Descargando archivo binario desde Google Drive (id: ${excelId})...`);
  
  const driveMediaUrl = `https://www.googleapis.com/drive/v3/files/${excelId}?alt=media`;
  const mediaRes = await fetch(driveMediaUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log("Media Download Status:", mediaRes.status);
  if (mediaRes.ok) {
    const buffer = await mediaRes.buffer();
    console.log(`✅ Archivo Excel descargado exitosamente de Google Drive! (${buffer.length} bytes)`);
    writeFileSync('downloaded_drive_maestria.xlsx', buffer);
  } else {
    console.log("Error descargando binario:", await mediaRes.text());
  }

  // 2. Probar acceso al otro Google Sheet 1aNLf1UF_sdZ_7Uc2KAiPIODhzR6ulR1RZ5FbX2b3CA0
  const sheet2Id = '1aNLf1UF_sdZ_7Uc2KAiPIODhzR6ulR1RZ5FbX2b3CA0';
  console.log(`\n📊 Consultando metadatos de Sheet 2 (id: ${sheet2Id})...`);
  const s2Res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheet2Id}?fields=sheets.properties`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const s2Data = await s2Res.json();
  if (s2Data.sheets) {
    console.log("✅ ¡Acceso exitoso al Google Sheet 2!");
    console.log("Pestañas:", s2Data.sheets.map(s => s.properties.title));
  } else {
    console.log("Sheet 2 (puede ser binario o requerir compartir con la SA):", s2Data);
  }
}

testDownloadFile().catch(console.error);
