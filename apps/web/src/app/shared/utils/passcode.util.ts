import { decodeRoomId, type RoomId } from '@contract/signal/room-id.model';
import * as Option from 'effect/Option';
import { PGP_WORDS } from '../constants/pgp-wordlist';
import { normalizePassword } from './password.util';

/** PGP word list entries, lowercased for comparison. */
const PGP_WORD_SET = new Set(PGP_WORDS.map((word) => word.toLowerCase()));

/** A room id and password decoded from a receive code. */
export interface ReceiveCode {
  /** Six-digit room id. */
  roomId: RoomId;
  /** Two-word password. */
  password: string;
}

/**
 * Checks that a hyphen separates a room id from a password.
 * @param separator Index of the first hyphen.
 * @param length Length of the full code.
 * @returns True when both sides of the hyphen are non-empty.
 */
const isSeparatorInside = (separator: number, length: number): boolean =>
  separator > 0 && separator < length - 1;

/**
 * Splits a normalized code on its first hyphen.
 * @param code Normalized passcode text.
 * @returns The room id and password, or null when a side is missing.
 */
const splitCode = (code: string): readonly [string, string] | null => {
  const separator = code.indexOf('-');
  return isSeparatorInside(separator, code.length)
    ? [code.slice(0, separator), code.slice(separator + 1)]
    : null;
};

/**
 * Decodes a room id from text, throwing when it is invalid.
 * @param value Candidate room id.
 * @returns The validated room id.
 */
const requireRoomId = (value: string): RoomId =>
  Option.getOrThrowWith(
    decodeRoomId(value),
    () => new Error('passcode room id must be six digits without a leading zero'),
  );

/**
 * Checks that a password is two known PGP words.
 * @param password Candidate password.
 * @returns True when both words are in the word list.
 */
const isPgpPair = (password: string): boolean => {
  const words = password.split('-');
  return words.length === 2 && words.every((word) => PGP_WORD_SET.has(word));
};

/**
 * Splits a passcode into its room id and password.
 * @param code Passcode typed or pasted by the user.
 * @returns The room id and password.
 */
export const parsePasscode = (code: string): { roomId: RoomId; password: string } => {
  const parts = splitCode(normalizePassword(code));
  if (!parts) {
    throw new Error('passcode must be <roomId>-<password>');
  }
  const [roomId, password] = parts;
  return { roomId: requireRoomId(roomId), password };
};

/**
 * Reads a receive code from user input.
 * @param input Text typed or pasted by the user.
 * @returns The decoded receive code, or none when the text is not one.
 */
export const parseReceiveCode = (input: string): Option.Option<ReceiveCode> => {
  const parts = splitCode(normalizePassword(input));
  if (!parts) return Option.none();
  const [roomId, password] = parts;
  return Option.map(
    Option.filter(decodeRoomId(roomId), () => isPgpPair(password)),
    (decoded) => ({ roomId: decoded, password }),
  );
};
