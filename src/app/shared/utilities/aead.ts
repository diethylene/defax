import { concatBytes } from '@noble/curves/utils.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import { lvCat } from './lv-cat';

export type SignalRole = 'initiator' | 'responder';

function buildAad(roomId: string, role: SignalRole): Uint8Array<ArrayBuffer> {
  return lvCat(utf8ToBytes(roomId), utf8ToBytes(role));
}

export async function seal(
  key: CryptoKey,
  plaintext: Uint8Array<ArrayBuffer>,
  roomId: string,
  role: SignalRole
): Promise<Uint8Array<ArrayBuffer>> {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, additionalData: buildAad(roomId, role) },
    key,
    plaintext
  );
  return concatBytes(nonce, new Uint8Array(ciphertext));
}

export async function open(
  key: CryptoKey,
  sealed: Uint8Array<ArrayBuffer>,
  roomId: string,
  role: SignalRole
): Promise<Uint8Array<ArrayBuffer>> {
  const nonce = sealed.subarray(0, 12);
  const ciphertext = sealed.subarray(12);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce, additionalData: buildAad(roomId, role) },
    key,
    ciphertext
  );
  return new Uint8Array(plaintext);
}
