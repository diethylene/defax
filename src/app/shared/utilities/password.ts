import { PGP_WORDS } from '../constants/pgp-wordlist';

export function generatePassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(2));
  return Array.from(bytes, (byte) => PGP_WORDS[byte]).join('-');
}

export function normalizePassword(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '-');
}
