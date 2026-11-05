import * as Schema from 'effect/Schema';
import { randomUint32 } from '../shared/random.util';

/** A six-digit room code shared between the two peers, never starting with a zero. */
export const RoomId = Schema.String.pipe(
  Schema.refine((value): value is string => /^[1-9]\d{5}$/.test(value), {
    message: 'roomId must be six digits without a leading zero',
  }),
).pipe(Schema.brand('RoomId'));

/** A validated room code. */
export type RoomId = typeof RoomId.Type;

/** Decodes a room code, returning None when the input is not a valid room code. */
export const decodeRoomId = Schema.decodeUnknownOption(RoomId);

/**
 * Derives the room code a draw maps to.
 * @param value Draw to map.
 * @returns The room code in the 100000 to 999999 range.
 */
export const roomIdFromValue = (value: number): RoomId =>
  Schema.decodeSync(RoomId)(String((value % 900000) + 100000));

/**
 * Draws a fresh room code.
 * @returns The room code in the 100000 to 999999 range.
 */
export const randomRoomId = (): RoomId => roomIdFromValue(randomUint32());
