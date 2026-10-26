import * as Schema from 'effect/Schema';

/**
 * Encodes raw bytes as a base64url string.
 * @param length Number of zero bytes to encode.
 * @returns The base64url string.
 */
const b64urlBytes = (length: number): string =>
  Schema.encodeSync(Schema.Uint8ArrayFromBase64Url)(new Uint8Array(length));

/**
 * Builds a valid 16-byte session id in its wire form.
 * @returns A base64url session id.
 */
export const sidFixture = (): string => b64urlBytes(16);

/**
 * Builds a valid 32-byte PAKE public key in its wire form.
 * @returns A base64url public key.
 */
export const yFixture = (): string => b64urlBytes(32);
