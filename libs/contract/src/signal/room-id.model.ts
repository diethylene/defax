import * as Schema from 'effect/Schema';

/** A six-digit room code shared between the two peers. */
export const RoomId = Schema.String.pipe(
  Schema.refine((value): value is string => /^\d{6}$/.test(value), {
    message: 'roomId must be six digits',
  }),
).pipe(Schema.brand('RoomId'));

/** A validated room code. */
export type RoomId = typeof RoomId.Type;
