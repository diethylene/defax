import { z } from 'zod';
import { sidSchema } from './sid';

export const signalMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('join') }),
  z.object({ type: z.literal('joined'), sid: sidSchema }),
  z.object({ type: z.literal('full') })
]);
