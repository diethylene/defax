import { base64UrlBytesSchema } from './base64url';

export const sidSchema = base64UrlBytesSchema(16, 'sid');
