import * as Match from 'effect/Match';

/** Path actions served by a room Durable Object. */
const ROOM_ACTIONS: ReadonlySet<string> = new Set(['init', 'ws']);
/** Path keys reserved for the HTTP API rather than a room. */
const RESERVED_KEYS: ReadonlySet<string> = new Set(['create']);

/**
 * Reports whether a path segment names a room handshake action.
 * @param action Path segment to test.
 * @returns Whether the segment is a handshake action.
 */
const isRoomAction = (action: string | undefined): action is string =>
  action !== undefined && ROOM_ACTIONS.has(action);

/**
 * Reports whether a path segment can name a room.
 * @param key Path segment to test.
 * @returns Whether the segment is a usable room key.
 */
const isRoomKey = (key: string | undefined): key is string =>
  key !== undefined && !RESERVED_KEYS.has(key);

/**
 * Extracts the room key from an init or upgrade path.
 * @param pathname Request pathname.
 * @returns The room key, or null when the path is not a room handshake path.
 */
export const roomKeyFromPath = (pathname: string): string | null => {
  const [root, key, action, ...rest] = pathname.split('/').filter(Boolean);
  return Match.value({ root, key, action, restLength: rest.length }).pipe(
    Match.when(
      { root: 'rooms', key: isRoomKey, action: isRoomAction, restLength: 0 },
      ({ key: roomKey }) => roomKey,
    ),
    Match.orElse(() => null),
  );
};
