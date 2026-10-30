import * as Schema from 'effect/Schema';

/**
 * Encodes bytes as unpadded base64url.
 * @param bytes Bytes to encode.
 * @returns The base64url text.
 */
export const encodeBase64Url = (bytes: Uint8Array): string =>
  Schema.encodeSync(Schema.Uint8ArrayFromBase64Url)(bytes);

/**
 * Decodes unpadded base64url text to bytes.
 * @param value Base64url text.
 * @returns The decoded bytes, backed by an ArrayBuffer.
 */
export const decodeBase64Url = (value: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(Schema.decodeUnknownSync(Schema.Uint8ArrayFromBase64Url)(value));
