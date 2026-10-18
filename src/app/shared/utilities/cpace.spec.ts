import {
  deriveGeneratorString,
  derivePublicKey,
  deriveSharedSecret,
  generateSecret,
  isValidPublicKey,
  mapToGroup
} from './cpace';

const sid = new Uint8Array(16);

describe('cpace', () => {
  it('derives a deterministic generator string', () => {
    expect(deriveGeneratorString(sid, 'apple-bird')).toEqual(
      deriveGeneratorString(sid, 'apple-bird')
    );
  });

  it('derives different generator strings for different passwords', () => {
    expect(deriveGeneratorString(sid, 'apple-bird')).not.toEqual(
      deriveGeneratorString(sid, 'bird-cat')
    );
  });

  it('maps a generator string to a valid group element', () => {
    const g = mapToGroup(deriveGeneratorString(sid, 'apple-bird'));
    expect(isValidPublicKey(g.toBytes())).toBe(true);
  });

  it('both parties derive the same shared secret', () => {
    const g = mapToGroup(deriveGeneratorString(sid, 'apple-bird'));
    const ya = generateSecret();
    const yb = generateSecret();
    expect(deriveSharedSecret(ya, derivePublicKey(yb, g))).toEqual(
      deriveSharedSecret(yb, derivePublicKey(ya, g))
    );
  });

  it('derives different shared secrets for different passwords', () => {
    const ga = mapToGroup(deriveGeneratorString(sid, 'apple-bird'));
    const gb = mapToGroup(deriveGeneratorString(sid, 'bird-cat'));
    const ya = generateSecret();
    const yb = generateSecret();
    expect(deriveSharedSecret(ya, derivePublicKey(yb, gb))).not.toEqual(
      deriveSharedSecret(yb, derivePublicKey(ya, ga))
    );
  });

  it('rejects the identity as a public key', () => {
    expect(isValidPublicKey(new Uint8Array(32))).toBe(false);
  });

  it('rejects public keys of the wrong length', () => {
    expect(isValidPublicKey(new Uint8Array(31))).toBe(false);
  });
});
