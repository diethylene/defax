import * as Schema from 'effect/Schema';
import { base64UrlBytes } from './base64url-bytes.model';

/** A 16-byte session id in its base64url wire form. */
export const Sid = base64UrlBytes(16, 'sid').pipe(Schema.brand('Sid'));

/** A validated session id. */
export type Sid = typeof Sid.Type;

/** Decodes a session id, returning None when the input is not a valid sid. */
export const decodeSid = Schema.decodeUnknownOption(Sid);

/**
 * Decodes a session id to its 16 raw bytes.
 * @param sid Session id in wire form.
 * @returns The decoded bytes, backed by its own ArrayBuffer.
 */
export const sidToBytes = (sid: Sid): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(Schema.decodeUnknownSync(Schema.Uint8ArrayFromBase64Url)(sid));

/**
 * Encodes 16 raw bytes as a session id.
 * @param bytes Bytes to encode.
 * @returns The session id in wire form.
 */
export const sidFromBytes = (bytes: Uint8Array): Sid =>
  Schema.decodeUnknownSync(Sid)(Schema.encodeSync(Schema.Uint8ArrayFromBase64Url)(bytes));
