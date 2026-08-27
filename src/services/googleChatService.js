// Servicio de integración con Google Chat API (búsqueda/creación de DMs 1 a 1)
//
// Cómo funciona (documentado y verificado contra la referencia oficial de Google
// antes de escribir este archivo — no se inventó ningún formato de URL):
//
// 1. Pide el scope 'chat.spaces' de forma INCREMENTAL: solo se solicita la primera
//    vez que alguien hace clic en "Chat" en el Panel Super Admin, no en el login
//    general de la app. Esto es intencional: la app está en modo "Externo / En
//    producción" sin verificar ante Google, con un tope de por vida de 100 personas
//    que pueden otorgar un permiso sensible sin aprobación. Pedirlo solo a quien
//    realmente usa el botón (roles gerenciales/dirección, que ya es la única
//    audiencia del Panel Super Admin) evita agotar ese cupo con gente que nunca
//    toca esta función.
// 2. Con ese token, llama a GET /v1/spaces:findDirectMessage?name=users/{email}
//    (Google permite usar el correo directo como alias de {user} cuando se
//    autentica como usuario — confirmado en la referencia oficial).
// 3. Si no existe todavía (404), llama a POST /v1/spaces:setup para crearlo.
// 4. En ambos casos, la respuesta trae el campo "spaceUri": la URL real de Google
//    para abrir esa conversación en el navegador. Se usa esa URL tal cual — no se
//    construye ningún enlace propio.
//
// Lo que NO está garantizado (ver reporte a José, 27/08/2026): que esto funcione
// igual para cuentas @gmail.com externas a la organización (armando.pilacuan@gmail.com,
// gomeznueve@gmail.com). Por eso todo el flujo tiene un fallback explícito: si algo
// falla, la función devuelve { success:false } y quien llama debe ofrecer el botón
// de "Correo" como respaldo, en vez de romper la experiencia.

import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from './firebase';

const CHAT_SCOPE = 'https://www.googleapis.com/auth/chat.spaces';
const TOKEN_KEY = 'googleChatToken';

/**
 * Devuelve un access token con el scope de Chat, pidiéndolo con un popup de
 * Google SOLO si todavía no lo tenemos guardado en esta sesión de navegador.
 */
export async function getChatAccessToken() {
  const cached = sessionStorage.getItem(TOKEN_KEY);
  if (cached) return cached;

  const provider = new GoogleAuthProvider();
  provider.addScope(CHAT_SCOPE);
  // Reutiliza la cuenta ya logueada cuando es posible, en vez de forzar elegir cuenta de nuevo
  provider.setCustomParameters({ login_hint: auth.currentUser?.email || '' });

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.accessToken) {
    throw new Error('Google no devolvió un token de acceso con el permiso de Chat.');
  }
  sessionStorage.setItem(TOKEN_KEY, credential.accessToken);
  return credential.accessToken;
}

async function findDirectMessageSpace(token, email) {
  const res = await fetch(
    `https://chat.googleapis.com/v1/spaces:findDirectMessage?name=users/${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (res.status === 404) return null; // no existe todavía, hay que crearlo
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`findDirectMessage falló (HTTP ${res.status}): ${body}`);
  }
  return res.json();
}

async function createDirectMessageSpace(token, email) {
  const res = await fetch('https://chat.googleapis.com/v1/spaces:setup', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      space: { spaceType: 'DIRECT_MESSAGE', singleUserBotDm: false },
      memberships: [{ member: { name: `users/${email}`, type: 'HUMAN' } }]
    })
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`spaces:setup falló (HTTP ${res.status}): ${body}`);
  }
  return res.json();
}

/**
 * Busca (o crea si no existe) la conversación 1 a 1 de Google Chat con `email`,
 * y devuelve { success: true, spaceUri } con la URL real de Google para abrirla.
 * Si algo falla (token, red, permisos, o el usuario destino no puede recibir DMs
 * por API), devuelve { success: false, error } sin lanzar excepción, para que
 * quien llama pueda ofrecer un respaldo (ej. el botón de Correo).
 */
export async function openOrCreateDirectMessage(email) {
  if (!email) return { success: false, error: 'Sin correo' };
  try {
    const token = await getChatAccessToken();
    let space = await findDirectMessageSpace(token, email);
    if (!space) {
      space = await createDirectMessageSpace(token, email);
    }
    if (!space?.spaceUri) {
      return { success: false, error: 'La API no devolvió una URL de espacio (spaceUri).' };
    }
    return { success: true, spaceUri: space.spaceUri };
  } catch (error) {
    console.error('Error abriendo Google Chat:', error);
    return { success: false, error: error.message || String(error) };
  }
}
