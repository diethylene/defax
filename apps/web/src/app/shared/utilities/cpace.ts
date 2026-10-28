import { ristretto255, ristretto255_hasher } from '@noble/curves/ed25519.js';
import { bytesToNumberLE, equalBytes } from '@noble/curves/utils.js';
import { sha512 } from '@noble/hashes/sha2.js';
import { CPACE_CI, CPACE_DSI, SHA512_BLOCK_SIZE } from '../constants/cpace';
import { lvCat, prependLen } from './lv-cat';

/** A ristretto255 group element. */
type GroupElement = InstanceType<typeof ristretto255.Point>;

/**
 * Derives the CPace generator string for a session.
 * @param sid Session id from the relay.
 * @param password Shared low-entropy password.
 * @param options Optional DSI, CI and block size overrides.
 * @returns The length-prefixed generator string.
 */
export const deriveGeneratorString = (
  sid: Uint8Array,
  password: Uint8Array,
  options: {
    dsi?: Uint8Array;
    ci?: Uint8Array;
    sInBytes?: number;
  } = {},
): Uint8Array => {
  const { dsi = CPACE_DSI, ci = CPACE_CI, sInBytes = SHA512_BLOCK_SIZE } = options;
  const zpad = Math.max(0, sInBytes - 1 - prependLen(password).length - prependLen(dsi).length);
  return lvCat(dsi, password, new Uint8Array(zpad), ci, sid);
};

/**
 * Maps a generator string to a group element.
 * @param genStr Generator string from `deriveGeneratorString`.
 * @returns The hashed group element.
 */
export const mapToGroup = (genStr: Uint8Array): GroupElement => {
  const derive = ristretto255_hasher.deriveToCurve;
  if (!derive) {
    throw new Error('ristretto255 element derivation is not available');
  }
  return derive(sha512(genStr));
};

/**
 * Reads a 32-byte secret into the group's scalar field.
 * @param bytes Exactly 32 bytes of entropy.
 * @returns The non-zero scalar.
 */
export const secretFromBytes = (bytes: Uint8Array): bigint => {
  if (bytes.length !== 32) {
    throw new Error('secret requires exactly 32 bytes');
  }
  const scalarBytes = Uint8Array.from(
    bytes,
    (byte, index) => (index === 31 ? byte & 0x0f : byte), // clear bits above the 252-bit group size
  );
  const scalar = bytesToNumberLE(scalarBytes);
  if (scalar === 0n) {
    throw new Error('secret must not be zero');
  }
  return scalar;
};

/**
 * Derives a public key from a secret and a generator.
 * @param secret Local scalar.
 * @param generator Shared group element.
 * @returns The encoded public key.
 */
export const derivePublicKey = (secret: bigint, generator: GroupElement): Uint8Array =>
  generator.multiply(secret).toBytes();

/**
 * Checks that bytes decode to a usable public key.
 * @param bytes Candidate public key.
 * @returns True when the bytes form a non-identity group element.
 */
export const isValidPublicKey = (bytes: Uint8Array): boolean => {
  try {
    return !ristretto255.Point.fromBytes(bytes).is0();
  } catch {
    return false;
  }
};

/**
 * Derives the shared secret for a session.
 * @param secret Local scalar.
 * @param peerPublicKey Public key received from the peer.
 * @param ownPublicKey Public key sent to the peer.
 * @returns The encoded shared group element.
 */
export const deriveSharedSecret = (
  secret: bigint,
  peerPublicKey: Uint8Array,
  ownPublicKey: Uint8Array,
): Uint8Array => {
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
};
