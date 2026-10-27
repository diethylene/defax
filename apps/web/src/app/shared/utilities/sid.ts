import type { Sid } from '../interfaces/signal-session';
import { decodeBase64Url, encodeBase64Url } from './base64url';

/**
 * Generates a fresh session id.
 * @returns 16 random bytes.
 */
export const createSid = (): Sid => crypto.getRandomValues(new Uint8Array(16));

/**
 * Encodes a session id for the wire.
 * @param sid Session id to encode.
 * @returns The base64url text.
 */
export const encodeSid = (sid: Sid): string => encodeBase64Url(sid);

/**
 * Decodes a session id from the wire.
 * @param value Base64url text holding 16 bytes.
 * @returns The decoded session id.
 */
export const decodeSid = (value: string): Sid => {
  const bytes = decodeBase64Url(value);
  if (bytes.length !== 16) {
    throw new Error('sid must be 16 bytes');
  }
  return bytes;
};
