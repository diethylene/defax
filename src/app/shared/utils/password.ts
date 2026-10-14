import { PGP_WORDS } from './pgp-wordlist';

export function generatePassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(2));
  return Array.from(bytes, (byte) => PGP_WORDS[byte]).join('-');
}
