import type { RoomId } from '../interfaces/signal-session';
import { normalizePassword } from './password';

export function parsePasscode(code: string): {
  roomId: RoomId;
  password: string;
} {
  const normalized = normalizePassword(code);
  const separator = normalized.indexOf('-');
  if (separator <= 0 || separator === normalized.length - 1) {
    throw new Error('passcode must be <roomId>-<password>');
  }
  return {
    roomId: normalized.slice(0, separator),
    password: normalized.slice(separator + 1)
  };
}
