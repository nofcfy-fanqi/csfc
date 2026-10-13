import { webcrypto } from 'node:crypto';
export const ITERATIONS = 600000;
export const AAD = 'CSFC website v1 / AES-256-GCM / PBKDF2-SHA256';
const encoder = new TextEncoder();
async function deriveKey(password, salt, usage) {
  const material = await webcrypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return webcrypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, [usage]);
}
export async function encrypt(payload, password) {
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, 'encrypt');
  const ciphertext = await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(AAD), tagLength: 128 }, key, encoder.encode(JSON.stringify(payload)));
  return { version: 1, algorithm: 'AES-256-GCM', kdf: 'PBKDF2-SHA256', iterations: ITERATIONS, salt: Buffer.from(salt).toString('base64'), iv: Buffer.from(iv).toString('base64'), ciphertext: Buffer.from(ciphertext).toString('base64') };
}
export async function decrypt(envelope, password) {
  if (envelope.version !== 1 || envelope.algorithm !== 'AES-256-GCM' || envelope.kdf !== 'PBKDF2-SHA256' || envelope.iterations !== ITERATIONS) throw new Error('Unsupported encrypted package.');
  const salt = Buffer.from(envelope.salt, 'base64');
  const iv = Buffer.from(envelope.iv, 'base64');
  if (salt.length !== 16 || iv.length !== 12) throw new Error('Invalid encryption parameters.');
  const key = await deriveKey(password, salt, 'decrypt');
  const plaintext = await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(AAD), tagLength: 128 }, key, Buffer.from(envelope.ciphertext, 'base64'));
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(plaintext));
}
