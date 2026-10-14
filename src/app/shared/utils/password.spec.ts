import { generatePassword } from './password';
import { PGP_WORDS } from './pgp-wordlist';

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
