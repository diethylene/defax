import { ristretto255, ristretto255_hasher } from '@noble/curves/ed25519.js';
import {
  bytesToNumberLE,
  concatBytes,
  equalBytes
} from '@noble/curves/utils.js';
import { sha512 } from '@noble/hashes/sha2.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import { PROTOCOL_VERSION } from '../constants/protocol-version';

// G_Ristretto255.DSI per draft-irtf-cfrg-cpace section 7.3.
const DSI = utf8ToBytes('CPaceRistretto255');
// Channel identifier binds the key to the protocol version.
const CI = utf8ToBytes(`defax-${PROTOCOL_VERSION}`);
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
  password: Uint8Array,
  dsi: Uint8Array = DSI,
  ci: Uint8Array = CI,
  sInBytes: number = SHA512_BLOCK_SIZE
): Uint8Array {
  const zpad = Math.max(
    0,
    sInBytes - 1 - prependLen(password).length - prependLen(dsi).length
  );
  return lvCat(dsi, password, new Uint8Array(zpad), ci, sid);
}

export function mapToGroup(genStr: Uint8Array): GroupElement {
  const derive = ristretto255_hasher.deriveToCurve;
  if (!derive) {
    throw new Error('ristretto255 element derivation is not available');
  }
  return derive(sha512(genStr));
}

export function secretFromBytes(bytes: Uint8Array): bigint {
  if (bytes.length !== 32) {
    throw new Error('secret requires exactly 32 bytes');
  }
  const scalarBytes = new Uint8Array(bytes);
  scalarBytes[31] &= 0x0f; // clear bits above the 252-bit group size
  return bytesToNumberLE(scalarBytes);
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
  peerPublicKey: Uint8Array,
  ownPublicKey: Uint8Array
): Uint8Array {
  if (equalBytes(peerPublicKey, ownPublicKey)) {
    throw new Error('peer public key is reflected');
  }
  const point = ristretto255.Point.fromBytes(peerPublicKey);
  if (point.is0()) {
    throw new Error('peer public key must not be the identity');
  }
  const shared = point.multiply(secret);
  if (shared.is0()) {
    throw new Error('shared secret must not be the identity');
  }
  return shared.toBytes();
}
