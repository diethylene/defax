import { RoomCreated } from '@contract/signal/room-created.model';
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from 'effect/http-api';
import * as Schema from 'effect/Schema';

/** Failure raised when the room's Durable Object cannot be initialized. */
export class RoomCreationFailed extends Schema.TaggedError<RoomCreationFailed>()(
  'RoomCreationFailed',
  {},
  { httpApiStatus: 500 },
) {}

/** Rooms endpoints. */
export const RoomsApi = HttpApiGroup.make('rooms').add(
  HttpApiEndpoint.post('createRoom', '/rooms/create', {
    success: RoomCreated.pipe(HttpApiSchema.status(201)),
    error: RoomCreationFailed,
  }),
);
