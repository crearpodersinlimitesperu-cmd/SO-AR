import { readFileSync, writeFileSync } from 'fs';
import crypto from 'crypto';

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

async function fetchUserSheet() {
  const token = await getAccessToken(['https://www.googleapis.com/auth/spreadsheets.readonly']);
  const sheetId = '1gt7kJblS5sULWDAZ_Gg1aQMIJTmkOIK2snaM-nnNdfI';
  
  const res1 = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties,properties.title`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const props = await res1.json();
  console.log('PROPS:', JSON.stringify(props, null, 2));
  
  if (props.sheets && props.sheets.length > 0) {
    for (const s of props.sheets) {
      const sheetName = s.properties.title;
      console.log(`\n=== SHEET: ${sheetName} ===`);
      const res2 = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}!A1:Z100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res2.json();
      console.log('DATA ROW COUNT:', data.values ? data.values.length : 0);
      if (data.values) {
        console.log('SAMPLE ROWS:', JSON.stringify(data.values.slice(0, 15), null, 2));
        writeFileSync(`scratch/sheet_${s.properties.sheetId || '0'}.json`, JSON.stringify(data.values, null, 2), 'utf8');
      }
    }
  }
}

fetchUserSheet().catch(console.error);
