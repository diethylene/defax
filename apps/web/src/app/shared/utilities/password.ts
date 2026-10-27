import { PGP_WORDS } from '../constants/pgp-wordlist';

/**
 * Generates a two-word password from the PGP word list.
 * @returns The two words joined by a hyphen.
 */
export const generatePassword = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(2));
  return Array.from(bytes, (byte) => PGP_WORDS[byte]).join('-');
};

/**
 * Normalizes a typed password or code to its canonical form.
 * @param input Raw text from the user.
 * @returns Lowercase text with single hyphens between parts.
 */
export const normalizePassword = (input: string): string =>
  input
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '-');
