import { bytesToNumberBE } from '@noble/curves/utils.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import { PROTOCOL_VERSION } from '../constants/protocol-version';

const label = (value: string): Uint8Array<ArrayBuffer> =>
  utf8ToBytes(`defax-${PROTOCOL_VERSION} ${value}`);

export function formatSas(bits: Uint8Array): string {
  return bytesToNumberBE(bits).toString(10);
}

export async function deriveSessionKeys(
  isk: Uint8Array<ArrayBuffer>,
  sid: Uint8Array<ArrayBuffer>
): Promise<{ signalingKey: CryptoKey; sas: string }> {
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
}
