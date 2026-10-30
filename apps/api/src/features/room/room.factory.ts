import { encodeBase64Url } from '@contract/signal/base64url.util';

/**
 * Builds a valid 16-byte session id in its wire form.
 * @returns A base64url session id.
 */
export const sidFixture = (): string => encodeBase64Url(new Uint8Array(16));

/**
 * Builds a valid 32-byte PAKE public key in its wire form.
 * @returns A base64url public key.
 */
export const yFixture = (): string => encodeBase64Url(new Uint8Array(32));
