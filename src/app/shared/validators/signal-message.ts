import { z } from 'zod';
import { ERROR_CODES, SEALED_KINDS } from '../constants/signal-message';
import { base64UrlBytesSchema } from './base64url';
import { sidSchema } from './sid';

const pakeKeySchema = base64UrlBytesSchema(32, 'pake y');

export const signalMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('join'), protocol: z.number() }),
  z.object({ type: z.literal('joined'), sid: sidSchema }),
  z.object({ type: z.literal('peer-joined') }),
  z.object({ type: z.literal('pake'), y: pakeKeySchema }),
  z.object({
    type: z.literal('sealed'),
    kind: z.enum(SEALED_KINDS),
    ct: z.string()
  }),
  z.object({
    type: z.literal('error'),
    code: z.enum(ERROR_CODES)
  })
]);
