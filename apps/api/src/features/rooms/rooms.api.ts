import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from 'effect/http-api';
import * as Schema from 'effect/Schema';

/** Body returned when a room is created. */
export const RoomCreated = Schema.Struct({
  /** Identifier of the new room. */
  id: Schema.String,
  /** Creation marker, always `created`. */
  status: Schema.Literals(['created']),
});

/** A validated room creation response. */
export type RoomCreated = typeof RoomCreated.Type;

/** Rooms endpoints; create stays a stub until the DurableObject is wired in. */
export const RoomsApi = HttpApiGroup.make('rooms').add(
  HttpApiEndpoint.post('createRoom', '/rooms/create', {
    success: RoomCreated.pipe(HttpApiSchema.status(201)),
  }),
);
