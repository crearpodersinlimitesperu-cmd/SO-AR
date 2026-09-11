#!/usr/bin/env node
/**
 * scripts/updateGitHubSecret.mjs
 * 
 * Actualizador seguro de Secrets en GitHub Actions usando curva 25519 (Libsodium crypto_box_seal).
 * 
 * Uso:
 *   node scripts/updateGitHubSecret.mjs <NOMBRE_SECRET> <VALOR_SECRET> [NOMBRE_REPO]
 * 
 * Requisitos:
 *   - Variable de entorno GITHUB_TOKEN (o GH_TOKEN) con permisos de escritura en 'repo' / 'workflow'.
 */

import sodium from 'libsodium-wrappers';
import 'dotenv/config';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const OWNER = process.env.GITHUB_OWNER || 'crearpodersinlimitesperu-cmd';
const DEFAULT_REPO = 'SO-AR';

export async function updateSecret(secretName, secretValue, repo = DEFAULT_REPO) {
  if (!GITHUB_TOKEN) {
    throw new Error('Variable de entorno GITHUB_TOKEN o GH_TOKEN requerida con permisos de repositorio.');
  }
  if (!secretName || !secretValue) {
    throw new Error('Uso: node updateGitHubSecret.mjs <NOMBRE_SECRET> <VALOR_SECRET> [REPO]');
  }

  await sodium.ready;

  // 1. Obtener la clave pública de cifrado del repositorio
  const pkRes = await fetch(`https://api.github.com/repos/${OWNER}/${repo}/actions/secrets/public-key`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'User-Agent': 'CausaOS-SecretManager',
      Accept: 'application/vnd.github+json'
    }
  });

  if (!pkRes.ok) {
    throw new Error(`Error obteniendo public-key de ${OWNER}/${repo}: ${pkRes.status} ${await pkRes.text()}`);
  }

  const { key_id, key } = await pkRes.json();
  const binkey = sodium.from_base64(key, sodium.base64_variants.ORIGINAL);

  // 2. Cifrar con libsodium crypto_box_seal (Curva 25519 sealed box)
  const binsec = sodium.from_string(secretValue);
  const encBytes = sodium.crypto_box_seal(binsec, binkey);
  const encrypted_value = sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL);

  // 3. Enviar secret cifrado al endpoint PUT de GitHub Actions
  const putRes = await fetch(`https://api.github.com/repos/${OWNER}/${repo}/actions/secrets/${secretName}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'User-Agent': 'CausaOS-SecretManager',
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ encrypted_value, key_id })
  });

  if (putRes.status === 201 || putRes.status === 204) {
    console.log(`✅ Secret '${secretName}' actualizado exitosamente en ${OWNER}/${repo} (HTTP ${putRes.status})`);
    return true;
  } else {
    throw new Error(`Error actualizando secret: ${putRes.status} ${await putRes.text()}`);
  }
}

// Ejecución CLI directa
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [,, name, val, customRepo] = process.argv;
  if (!name || !val) {
    console.log("Uso: node scripts/updateGitHubSecret.mjs <NOMBRE_SECRET> <VALOR_SECRET> [NOMBRE_REPO]");
    process.exit(1);
  }
  updateSecret(name, val, customRepo).catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
}
