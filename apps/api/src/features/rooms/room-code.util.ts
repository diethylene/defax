import { RoomId } from '@contract/signal/room-id.model';
import * as Schema from 'effect/Schema';

/** Number of distinct six-digit room codes. */
const ROOM_CODE_COUNT = 1_000_000;
/** Largest random draw that divides evenly into the room code range. */
const UNBIASED_LIMIT = Math.floor(0x1_0000_0000 / ROOM_CODE_COUNT) * ROOM_CODE_COUNT;

/** Draws an unbiased index into the room code range. */
const drawCode = (): number => {
  const [value = 0] = crypto.getRandomValues(new Uint32Array(1));
  return value >= UNBIASED_LIMIT ? drawCode() : value % ROOM_CODE_COUNT;
};

/**
 * Draws a fresh six-digit room code.
 * @returns The branded room code.
 */
export const generateRoomCode = (): RoomId =>
  Schema.decodeSync(RoomId)(String(drawCode()).padStart(6, '0'));
