/**
 * Encodes bytes as unpadded base64url.
 * @param bytes Bytes to encode.
 * @returns The base64url text.
 */
export const encodeBase64Url = (bytes: Uint8Array): string =>
  btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

/**
 * Decodes unpadded base64url text to bytes.
 * @param value Base64url text.
 * @returns The decoded bytes.
 */
export const decodeBase64Url = (value: string): Uint8Array => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
};
