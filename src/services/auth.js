import { decryptPrivKey } from './keystore.js';

const PRF_LABEL = new TextEncoder().encode('omnistar-key-v1');

export function isWebAuthnAvailable() {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    (window.location.protocol === 'https:' || window.location.hostname === 'localhost')
  );
}

export async function setupWebAuthn(username) {
  if (!isWebAuthnAvailable()) return null;
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'Omnistar Wallet', id: window.location.hostname },
        user: { id: userId, name: username, displayName: username },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },   // ES256
          { alg: -257, type: 'public-key' },  // RS256
        ],
        authenticatorSelection: {
          userVerification: 'required',
          residentKey: 'preferred',
        },
        extensions: { prf: { eval: { first: PRF_LABEL } } },
      },
    });

    const prfResult = credential.getClientExtensionResults()?.prf?.results?.first;
    if (!prfResult) return null; // PRF not supported

    const encryptionKey = await crypto.subtle.importKey(
      'raw',
      prfResult,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    return {
      credentialId: new Uint8Array(credential.rawId),
      encryptionKey,
    };
  } catch (e) {
    console.error('WebAuthn setup failed:', e);
    return null;
  }
}

export async function unlockWithWebAuthn(credentialId) {
  if (!isWebAuthnAvailable()) return null;
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ id: credentialId, type: 'public-key' }],
        userVerification: 'required',
        extensions: { prf: { eval: { first: PRF_LABEL } } },
      },
    });

    const prfResult = assertion.getClientExtensionResults()?.prf?.results?.first;
    if (!prfResult) return null;

    const encryptionKey = await crypto.subtle.importKey(
      'raw',
      prfResult,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    return encryptionKey;
  } catch (e) {
    console.error('WebAuthn unlock failed:', e);
    return null;
  }
}

export async function setupPIN(pin) {
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const encryptionKey = await _derivePINKey(pin, salt);
  return { salt, encryptionKey };
}

export async function unlockWithPIN(pin, salt) {
  return _derivePINKey(pin, salt);
}

export async function verifyPIN(pin, salt, ciphertext, iv) {
  try {
    const key = await _derivePINKey(pin, salt);
    await decryptPrivKey(ciphertext, iv, key);
    return true;
  } catch {
    return false;
  }
}

async function _derivePINKey(pin, salt) {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 210000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}
