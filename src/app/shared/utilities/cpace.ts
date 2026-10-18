import { ristretto255, ristretto255_hasher } from '@noble/curves/ed25519.js';
import { bytesToNumberLE, concatBytes } from '@noble/curves/utils.js';
import { sha512 } from '@noble/hashes/sha2.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';

// G_Ristretto255.DSI from draft-irtf-cfrg-cpace section 7.3.
const DSI = 'CPaceRistretto255';
const SHA512_BLOCK_SIZE = 128;

type GroupElement = InstanceType<typeof ristretto255.Point>;

function encodeLeb128(value: number): Uint8Array {
  const out: number[] = [];
  let remaining = value;
  while (remaining >= 128) {
    out.push((remaining & 0x7f) | 0x80);
    remaining = Math.floor(remaining / 128);
  }
  out.push(remaining);
  return new Uint8Array(out);
}

function prependLen(data: Uint8Array): Uint8Array {
  return concatBytes(encodeLeb128(data.length), data);
}

function lvCat(...parts: Uint8Array[]): Uint8Array {
  return concatBytes(...parts.map(prependLen));
}

export function deriveGeneratorString(
  sid: Uint8Array,
  password: string
): Uint8Array {
  const dsi = utf8ToBytes(DSI);
  const prs = utf8ToBytes(password);
  const zpad = Math.max(
    0,
    SHA512_BLOCK_SIZE - 1 - prependLen(prs).length - prependLen(dsi).length
  );
  return lvCat(dsi, prs, new Uint8Array(zpad), new Uint8Array(0), sid);
}

export function mapToGroup(genStr: Uint8Array): GroupElement {
  const derive = ristretto255_hasher.deriveToCurve;
  if (!derive) {
    throw new Error('ristretto255 element derivation is not available');
  }
  return derive(sha512(genStr));
}

export function generateSecret(): bigint {
  let scalar: bigint;
  do {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    bytes[31] &= 0x0f; // keep the low 252 bits, per CPace sample_scalar
    scalar = bytesToNumberLE(bytes);
  } while (scalar === 0n);
  return scalar;
}

export function derivePublicKey(
  secret: bigint,
  generator: GroupElement
): Uint8Array {
  return generator.multiply(secret).toBytes();
}

export function isValidPublicKey(bytes: Uint8Array): boolean {
  try {
    return !ristretto255.Point.fromBytes(bytes).is0();
  } catch {
    return false;
  }
}

export function deriveSharedSecret(
  secret: bigint,
  peerPublicKey: Uint8Array
): Uint8Array {
  const point = ristretto255.Point.fromBytes(peerPublicKey);
  if (point.is0()) {
    throw new Error('peer public key must not be the identity');
  }
  return point.multiply(secret).toBytes();
}
