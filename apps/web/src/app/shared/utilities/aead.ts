import { concatBytes } from '@noble/curves/utils.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import { lvCat } from './lv-cat';

export type SignalRole = 'initiator' | 'responder';

const NONCE_LENGTH = 12;
const MIN_SEALED_LENGTH = NONCE_LENGTH + 16; // nonce + GCM tag

function buildAad(
  roomId: string,
  sealedBy: SignalRole
): Uint8Array<ArrayBuffer> {
  return lvCat(utf8ToBytes(roomId), utf8ToBytes(sealedBy));
}

export async function seal(
  key: CryptoKey,
  plaintext: Uint8Array<ArrayBuffer>,
  roomId: string,
  sealedBy: SignalRole
): Promise<Uint8Array<ArrayBuffer>> {
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LENGTH));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, additionalData: buildAad(roomId, sealedBy) },
    key,
    plaintext
  );
  return concatBytes(nonce, new Uint8Array(ciphertext));
}

export async function open(
  key: CryptoKey,
  sealed: Uint8Array<ArrayBuffer>,
  roomId: string,
  sealedBy: SignalRole
): Promise<Uint8Array<ArrayBuffer>> {
  if (sealed.length < MIN_SEALED_LENGTH) {
    throw new Error('sealed message is too short');
  }
  const nonce = sealed.subarray(0, NONCE_LENGTH);
  const ciphertext = sealed.subarray(NONCE_LENGTH);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce, additionalData: buildAad(roomId, sealedBy) },
    key,
    ciphertext
  );
  return new Uint8Array(plaintext);
}
