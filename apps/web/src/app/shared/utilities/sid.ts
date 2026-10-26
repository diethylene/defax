import type { Sid } from '../interfaces/signal-session';
import { decodeBase64Url, encodeBase64Url } from './base64url';

export function createSid(): Sid {
  return crypto.getRandomValues(new Uint8Array(16));
}

export function encodeSid(sid: Sid): string {
  return encodeBase64Url(sid);
}

export function decodeSid(value: string): Sid {
  const bytes = decodeBase64Url(value);
  if (bytes.length !== 16) {
    throw new Error('sid must be 16 bytes');
  }
  return bytes;
}
