import { bytesToNumberLE } from '@noble/curves/utils.js';
import {
  deriveGeneratorString,
  derivePublicKey,
  deriveSharedSecret,
  isValidPublicKey,
  mapToGroup,
  secretFromBytes
} from './cpace';

const encoder = new TextEncoder();
const sid = new Uint8Array(16);
const password = (value: string): Uint8Array => encoder.encode(value);
const secret = (seed: number): bigint =>
  bytesToNumberLE(new Uint8Array(32).fill(seed));

describe('deriveGeneratorString', () => {
  it('derives a deterministic generator string', () => {
    expect(deriveGeneratorString(sid, password('apple-bird'))).toEqual(
      deriveGeneratorString(sid, password('apple-bird'))
    );
  });

  it('derives different generator strings for different passwords', () => {
    expect(deriveGeneratorString(sid, password('apple-bird'))).not.toEqual(
      deriveGeneratorString(sid, password('bird-cat'))
    );
  });

  it('accepts custom dsi, ci, and block size', () => {
    const custom = deriveGeneratorString(sid, password('apple-bird'), {
      dsi: encoder.encode('CUSTOM_DSI'),
      ci: encoder.encode('CUSTOM_CI'),
      sInBytes: 64
    });
    expect(custom).not.toEqual(
      deriveGeneratorString(sid, password('apple-bird'))
    );
  });
});

describe('cpace key agreement', () => {
  it('maps a generator string to a valid group element', () => {
    const g = mapToGroup(deriveGeneratorString(sid, password('apple-bird')));
    expect(isValidPublicKey(g.toBytes())).toBe(true);
  });

  it('both parties derive the same shared secret', () => {
    const g = mapToGroup(deriveGeneratorString(sid, password('apple-bird')));
    const ya = secret(1);
    const yb = secret(2);
    const Ya = derivePublicKey(ya, g);
    const Yb = derivePublicKey(yb, g);
    expect(deriveSharedSecret(ya, Yb, Ya)).toEqual(
      deriveSharedSecret(yb, Ya, Yb)
    );
  });

  it('derives different shared secrets for different passwords', () => {
    const ga = mapToGroup(deriveGeneratorString(sid, password('apple-bird')));
    const gb = mapToGroup(deriveGeneratorString(sid, password('bird-cat')));
    const ya = secret(1);
    const yb = secret(2);
    const Ya = derivePublicKey(ya, ga);
    const Yb = derivePublicKey(yb, gb);
    expect(deriveSharedSecret(ya, Yb, Ya)).not.toEqual(
      deriveSharedSecret(yb, Ya, Yb)
    );
  });
});

describe('cpace validation', () => {
  it('rejects the identity as a public key', () => {
    expect(isValidPublicKey(new Uint8Array(32))).toBe(false);
  });

  it('rejects public keys of the wrong length', () => {
    expect(isValidPublicKey(new Uint8Array(31))).toBe(false);
  });

  it('rejects a reflected public key', () => {
    const g = mapToGroup(deriveGeneratorString(sid, password('apple-bird')));
    const ya = secret(1);
    const Ya = derivePublicKey(ya, g);
    expect(() => deriveSharedSecret(ya, Ya, Ya)).toThrow('reflected');
  });

  it('derives a non-zero scalar from 32 random bytes', () => {
    expect(secretFromBytes(new Uint8Array(32).fill(7))).toBeGreaterThan(0n);
  });

  it('rejects secrets from bytes of the wrong length', () => {
    expect(() => secretFromBytes(new Uint8Array(16))).toThrow('32 bytes');
  });

  it('rejects a zero scalar', () => {
    expect(() => secretFromBytes(new Uint8Array(32))).toThrow('zero');
  });
});
