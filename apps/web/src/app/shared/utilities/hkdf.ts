import { bytesToNumberBE } from '@noble/curves/utils.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import { PROTOCOL_VERSION } from '@contract/signal/protocol-version.constant';

/**
 * Builds the protocol-versioned HKDF info label for a purpose.
 * @param value Purpose of the derived key.
 * @returns The label bytes.
 */
const label = (value: string): Uint8Array<ArrayBuffer> =>
  utf8ToBytes(`defax-${PROTOCOL_VERSION} ${value}`);

/**
 * Formats SAS bits as the six-digit code both peers compare.
 * @param bits Derived SAS bits.
 * @returns The six-digit code as text.
 */
export const formatSas = (bits: Uint8Array): string =>
  (bytesToNumberBE(bits) % 1_000_000n).toString().padStart(6, '0');

/**
 * Derives the signaling key and the SAS from the implicit session key.
 * @param isk Implicit session key, zeroed once imported.
 * @param sid Session id used as the HKDF salt.
 * @returns The AES-GCM signaling key and the six-digit SAS.
 */
export const deriveSessionKeys = async (
  isk: Uint8Array<ArrayBuffer>,
  sid: Uint8Array<ArrayBuffer>
): Promise<{ signalingKey: CryptoKey; sas: string }> => {
  const base = await crypto.subtle.importKey('raw', isk, 'HKDF', false, [
    'deriveKey',
    'deriveBits'
  ]);
  isk.fill(0);

  const signalingKey = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-512', salt: sid, info: label('signaling-key') },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  const sasBits = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-512', salt: sid, info: label('sas') },
      base,
      32
    )
  );
  const sas = formatSas(sasBits);
  sasBits.fill(0);

  return { signalingKey, sas };
};
