import { readFileSync, writeFileSync } from 'fs';
import crypto from 'crypto';
import fetch from 'node-fetch';

const keyPath = "C:\\Users\\josem\\Downloads\\SO-AR\\centro-operativo-cpsl-65ad52160f45.json";
const sa = JSON.parse(readFileSync(keyPath, 'utf8'));

function base64UrlEncode(str) {
  return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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
  const signature = signer.sign(sa.private_key, 'base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const jwt = `${signInput}.${signature}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt })
  });
  const data = await res.json();
  return data.access_token;
}

async function fetchSheet() {
  const token = await getAccessToken(['https://www.googleapis.com/auth/spreadsheets.readonly']);
  const sheetId = '1Qo7DIkJeS2yZcBLCV-nl5x-V_-g7Il--';
  
  const res1 = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const props = await res1.json();
  console.log(JSON.stringify(props, null, 2));
  
  if (!props.sheets) {
    console.error("No sheets found in properties response");
    return;
  }
  
  const sheetName = props.sheets[0].properties.title;
  console.log(`Fetching sheet: ${sheetName}`);
  
  const res2 = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}!A1:Z50`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const data = await res2.json();
  console.log(JSON.stringify(data, null, 2));
}

fetchSheet().catch(console.error);
