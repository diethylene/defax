import { PGP_WORDS } from '../constants/pgp-wordlist';
import type { RoomId } from '../interfaces/signal-session';
import { normalizePassword } from './password';

const ROOM_ID_PATTERN = /^\d{6}$/;
const PGP_WORD_SET = new Set(PGP_WORDS.map((word) => word.toLowerCase()));

export interface ReceiveCode {
  roomId: RoomId;
  password: string;
}

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

export function parseReceiveCode(input: string): ReceiveCode | null {
  const normalized = normalizePassword(input);
  const separator = normalized.indexOf('-');
  if (separator <= 0 || separator === normalized.length - 1) return null;
  const roomId = normalized.slice(0, separator);
  const password = normalized.slice(separator + 1);
  if (!ROOM_ID_PATTERN.test(roomId)) return null;
  const words = password.split('-');
  if (words.length !== 2 || words.some((word) => !PGP_WORD_SET.has(word))) {
    return null;
  }
  return { roomId, password };
}
