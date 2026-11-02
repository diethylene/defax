import type { Role } from '@contract/signal/role.model';
import { concatBytes } from '@noble/curves/utils.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import { lvCat } from './lv-cat';

/** AES-GCM nonce length in bytes. */
const NONCE_LENGTH = 12;

/** Smallest valid sealed message: nonce plus GCM tag. */
const MIN_SEALED_LENGTH = NONCE_LENGTH + 16;

/**
 * Builds the additional data binding a message to its room and sender.
 * @param roomId Room the message belongs to.
 * @param sealedBy Role that sealed the message.
 * @returns The length-prefixed additional data.
 */
const buildAad = (roomId: string, sealedBy: Role): Uint8Array<ArrayBuffer> =>
  lvCat(utf8ToBytes(roomId), utf8ToBytes(sealedBy));

/**
 * Encrypts a plaintext for one room and role.
 * @param key AES-GCM key shared by both peers.
 * @param plaintext Bytes to encrypt.
 * @param roomId Room the message belongs to.
 * @param sealedBy Role that seals the message.
 * @returns The nonce followed by the ciphertext and GCM tag.
 */
export const seal = async (
  key: CryptoKey,
  plaintext: Uint8Array<ArrayBuffer>,
  roomId: string,
  sealedBy: Role,
): Promise<Uint8Array<ArrayBuffer>> => {
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LENGTH));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, additionalData: buildAad(roomId, sealedBy) },
    key,
    plaintext,
  );
  return concatBytes(nonce, new Uint8Array(ciphertext));
};

/**
 * Decrypts a sealed message for one room and role.
 * @param key AES-GCM key shared by both peers.
 * @param sealed Nonce followed by the ciphertext and GCM tag.
 * @param roomId Room the message belongs to.
 * @param sealedBy Role that sealed the message.
 * @returns The decrypted plaintext.
 */
export const open = async (
  key: CryptoKey,
  sealed: Uint8Array<ArrayBuffer>,
  roomId: string,
  sealedBy: Role,
): Promise<Uint8Array<ArrayBuffer>> => {
  if (sealed.length < MIN_SEALED_LENGTH) {
    throw new Error('sealed message is too short');
  }
  const nonce = sealed.subarray(0, NONCE_LENGTH);
  const ciphertext = sealed.subarray(NONCE_LENGTH);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce, additionalData: buildAad(roomId, sealedBy) },
    key,
    ciphertext,
  );
  return new Uint8Array(plaintext);
};
