import type { SignalMessage } from '../interfaces/signal-message';
import { signalMessageSchema } from '../validators/signal-message';

export function parseSignalMessage(data: unknown): SignalMessage | null {
  const result = signalMessageSchema.safeParse(data);
  return result.success ? result.data : null;
}
