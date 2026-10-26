import * as Schema from 'effect/Schema';
import { base64UrlBytes } from './base64url-bytes.model';

/** A 16-byte session id in its base64url wire form. */
export const Sid = base64UrlBytes(16, 'sid');

/** A validated session id. */
export type Sid = typeof Sid.Type;

/** Decodes a session id, returning None when the input is not a valid sid. */
export const decodeSid = Schema.decodeUnknownOption(Sid);
