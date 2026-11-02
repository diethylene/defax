import { PGP_WORDS } from '../constants/pgp-wordlist';
import { generatePassword, normalizePassword } from './password';

describe('generatePassword', () => {
  it('holds 256 unique words', () => {
    expect(PGP_WORDS).toHaveLength(256);
    expect(new Set(PGP_WORDS).size).toBe(256);
  });

  it('maps byte 0 and byte 255 to the correct words', () => {
    expect(PGP_WORDS[0]).toBe('aardvark');
    expect(PGP_WORDS[255]).toBe('Zulu');
  });

  it('produces two hyphen-separated words from the list', () => {
    const parts = generatePassword().split('-');
    expect(parts).toHaveLength(2);
    expect(PGP_WORDS).toContain(parts[0]);
    expect(PGP_WORDS).toContain(parts[1]);
  });

  it('produces distinct passwords across calls', () => {
    expect(generatePassword()).not.toBe(generatePassword());
  });
});

describe('normalizePassword', () => {
  it('trims and lowercases', () => {
    expect(normalizePassword('  Word-Bird  ')).toBe('word-bird');
  });

  it('collapses separator runs to a single hyphen', () => {
    expect(normalizePassword('word  bird')).toBe('word-bird');
    expect(normalizePassword('word--bird')).toBe('word-bird');
    expect(normalizePassword('word_bird')).toBe('word-bird');
  });

  it('leaves an already normalized password unchanged', () => {
    expect(normalizePassword('word-bird')).toBe('word-bird');
  });
});
